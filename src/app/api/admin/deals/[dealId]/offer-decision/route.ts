import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { dealStageLabel } from '@/lib/deal-stages'
import { z } from 'zod'

const schema = z.object({
  decision: z.enum(['ACCEPTED', 'REJECTED']),
  vendorDecisionNote: z.string().max(2000).optional().default(''),
})

/** Admin records the vendor's decision on an investor's offer.
 *  ACCEPTED → deal stage moves to OFFER_ACCEPTED.
 *  REJECTED → stage moves to FALLEN_THROUGH (deal can be revived later by admin moving back). */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ dealId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { dealId } = await ctx.params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      offer: true,
      application: { include: { investorProfile: { include: { user: { select: { email: true } } } } } },
    },
  })
  if (!deal?.offer) return NextResponse.json({ error: 'No offer to decide' }, { status: 404 })
  if (deal.offer.status !== 'PENDING') {
    return NextResponse.json({ error: 'Offer is already decided.' }, { status: 409 })
  }

  const { decision, vendorDecisionNote } = parsed.data
  const nextStage = decision === 'ACCEPTED' ? 'OFFER_ACCEPTED' : 'FALLEN_THROUGH'

  await prisma.$transaction([
    prisma.offer.update({
      where: { dealId },
      data: { status: decision, vendorDecisionNote: vendorDecisionNote || null },
    }),
    prisma.deal.update({ where: { id: dealId }, data: { stage: nextStage } }),
    prisma.dealStageHistory.create({
      data: {
        dealId,
        fromStage: deal.stage,
        toStage: nextStage,
        changedByUserId: session.user.id,
        note: vendorDecisionNote || (decision === 'ACCEPTED' ? 'Vendor accepted the offer' : 'Vendor declined the offer'),
      },
    }),
  ])

  // Email investor
  try {
    const email = deal.application.investorProfile.user.email
    await sendEmail({
      to: email,
      subject: `Offer ${decision.toLowerCase()} — ${deal.address}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0e8d8;padding:40px">
          <h1 style="color:#c9a84c;font-size:24px;font-weight:300">Offer ${decision === 'ACCEPTED' ? 'Accepted' : 'Declined'}</h1>
          <p>Dear ${deal.application.investorProfile.firstName},</p>
          <p>The vendor has <strong style="color:${decision === 'ACCEPTED' ? '#c9a84c' : '#f87171'}">${decision === 'ACCEPTED' ? 'accepted' : 'declined'}</strong> your offer on <strong>${deal.address}</strong>.</p>
          ${vendorDecisionNote ? `<p style="border-left:2px solid #c9a84c;padding-left:16px;color:#b3b3b3;font-style:italic">${vendorDecisionNote}</p>` : ''}
          <p>Pipeline stage is now <strong>${dealStageLabel(nextStage)}</strong>.</p>
          <p><a href="${process.env.NEXTAUTH_URL}/portal/deals/${dealId}" style="color:#c9a84c">View deal →</a></p>
        </div>
      `,
    })
  } catch (e) {
    console.error('Offer decision email failed (non-fatal):', e)
  }

  return NextResponse.json({ success: true })
}
