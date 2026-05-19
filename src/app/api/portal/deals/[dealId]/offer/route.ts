import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { hasActiveProofOfFunds } from '@/lib/proof-of-funds'
import { getInvestorDeal } from '@/lib/deal-access'
import { z } from 'zod'

const offerSchema = z.object({
  amount: z.number().positive().max(1_000_000_000),
  depositPercent: z.number().int().min(0).max(100),
  financingSource: z.enum(['CASH', 'MORTGAGE', 'MIXED']),
  targetExchangeDate: z.string().optional().default(''),
  conditions: z.string().max(2000).optional().default(''),
})

const OFFER_INCLUDE = {
  offer: true,
  response: true,
  application: { include: { investorProfile: true } },
} as const

function loadOfferDeal(dealId: string, userId: string) {
  return getInvestorDeal(dealId, userId, { include: OFFER_INCLUDE })
}

async function notifyAdminOnOffer(action: 'submitted' | 'updated' | 'withdrawn', deal: { title: string; address: string }, amount: number | null, firstName: string) {
  try {
    await sendEmail({
      to: process.env.RESEND_TO_EMAIL!,
      subject: `Offer ${action} — ${firstName} on ${deal.address}`,
      html: `
        <h2>Offer ${action}</h2>
        <p><strong>${firstName}</strong> has ${action} an offer${amount !== null ? ` of <strong>£${amount.toLocaleString('en-GB')}</strong>` : ''} on ${deal.title} (${deal.address}).</p>
        <p><a href="${process.env.NEXTAUTH_URL}/admin/investors">View in dashboard →</a></p>
      `,
    })
  } catch (e) {
    console.error('Offer email failed (non-fatal):', e)
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ dealId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dealId } = await ctx.params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = offerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const deal = await loadOfferDeal(dealId, session.user.id)
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  // C8 — distinguish active offer (block) vs decided/withdrawn (allow replace).
  // PENDING: use PATCH instead of POST. ACCEPTED: cannot revise an accepted offer.
  // REJECTED/WITHDRAWN: archive (delete) the prior and create a fresh one — this is
  // the counter-offer flow after the vendor declines.
  if (deal.offer?.status === 'PENDING') {
    return NextResponse.json({ error: 'An offer already exists for this deal. Use update.' }, { status: 409 })
  }
  if (deal.offer?.status === 'ACCEPTED') {
    return NextResponse.json({ error: 'This offer has been accepted by the vendor — no revised offers can be submitted.' }, { status: 409 })
  }
  const isReplacement = Boolean(deal.offer && (deal.offer.status === 'REJECTED' || deal.offer.status === 'WITHDRAWN'))
  const priorAmount = deal.offer ? Number(deal.offer.amount) : null
  const priorStatus = deal.offer?.status ?? null

  // C4 fix — must have accepted the deal before submitting a formal offer.
  // UI already gates OfferForm rendering on this; enforce server-side too.
  if (deal.response?.intent !== 'ACCEPT') {
    return NextResponse.json(
      { error: 'Respond to the deal with "Accept" before submitting a formal offer.', code: 'RESPONSE_REQUIRED' },
      { status: 409 },
    )
  }

  const pofOk = await hasActiveProofOfFunds(deal.applicationId)
  if (!pofOk) {
    return NextResponse.json(
      { error: 'Upload a recent proof of funds (bank statement or mortgage AIP within 6 months) before submitting an offer.', code: 'POF_REQUIRED' },
      { status: 403 },
    )
  }

  const d = parsed.data
  const wantsStageAdvance = deal.stage === 'PROPOSED'
  const noteForHistory = isReplacement
    ? `Investor submitted revised offer (replaces previous: £${priorAmount?.toLocaleString('en-GB')}, ${priorStatus})`
    : 'Offer submitted by investor'

  try {
    await prisma.$transaction([
      // C8 — when replacing a REJECTED/WITHDRAWN offer, delete it first so the
      // Offer.dealId @unique constraint lets the new row insert. Audit trail is
      // preserved via DealStageHistory's note (includes prior amount + status).
      ...(isReplacement ? [prisma.offer.delete({ where: { dealId } })] : []),
      prisma.offer.create({
        data: {
          dealId,
          amount: d.amount,
          depositPercent: d.depositPercent,
          financingSource: d.financingSource,
          targetExchangeDate: d.targetExchangeDate ? new Date(d.targetExchangeDate) : null,
          conditions: d.conditions || null,
        },
      }),
      ...(wantsStageAdvance ? [
        prisma.deal.update({ where: { id: dealId }, data: { stage: 'OFFER_PENDING' } }),
        prisma.dealStageHistory.create({
          data: { dealId, fromStage: 'PROPOSED', toStage: 'OFFER_PENDING', changedByUserId: session.user.id, note: noteForHistory },
        }),
      ] : []),
    ])
  } catch (e: any) {
    // H6 fix — double-click race: Offer.dealId @unique rejects the loser with P2002
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'An offer was already submitted for this deal.' }, { status: 409 })
    }
    throw e
  }

  await notifyAdminOnOffer(isReplacement ? 'updated' : 'submitted', deal, d.amount, deal.application.investorProfile.firstName)
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ dealId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dealId } = await ctx.params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = offerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const deal = await loadOfferDeal(dealId, session.user.id)
  if (!deal?.offer) return NextResponse.json({ error: 'No offer to update' }, { status: 404 })
  if (deal.offer.status !== 'PENDING') {
    return NextResponse.json({ error: 'This offer has already been decided and cannot be edited.' }, { status: 409 })
  }

  // C3 fix — proof-of-funds freshness must be re-validated on edits too. Without
  // this, an investor with stale PoF could raise their amount without re-attesting.
  const pofOk = await hasActiveProofOfFunds(deal.applicationId)
  if (!pofOk) {
    return NextResponse.json(
      { error: 'Upload a recent proof of funds (bank statement or mortgage AIP within 6 months) before editing your offer.', code: 'POF_REQUIRED' },
      { status: 403 },
    )
  }

  const d = parsed.data
  await prisma.offer.update({
    where: { dealId },
    data: {
      amount: d.amount,
      depositPercent: d.depositPercent,
      financingSource: d.financingSource,
      targetExchangeDate: d.targetExchangeDate ? new Date(d.targetExchangeDate) : null,
      conditions: d.conditions || null,
    },
  })

  await notifyAdminOnOffer('updated', deal, d.amount, deal.application.investorProfile.firstName)
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ dealId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dealId } = await ctx.params
  const deal = await loadOfferDeal(dealId, session.user.id)
  if (!deal?.offer) return NextResponse.json({ error: 'No offer to withdraw' }, { status: 404 })
  if (deal.offer.status !== 'PENDING') {
    return NextResponse.json({ error: 'This offer has already been decided.' }, { status: 409 })
  }

  await prisma.offer.update({
    where: { dealId },
    data: { status: 'WITHDRAWN' },
  })
  await notifyAdminOnOffer('withdrawn', deal, null, deal.application.investorProfile.firstName)
  return NextResponse.json({ success: true })
}
