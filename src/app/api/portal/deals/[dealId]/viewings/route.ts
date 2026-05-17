import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { hasActiveProofOfFunds } from '@/lib/proof-of-funds'
import { z } from 'zod'

const requestSchema = z.object({
  requestedSlot: z.string().min(1, 'Pick a date and time'),
  alternativeSlot: z.string().optional().default(''),
  investorNote: z.string().max(1000).optional().default(''),
})

async function loadDealForUser(dealId: string, userId: string, role: string) {
  if (role === 'admin') {
    return prisma.deal.findUnique({
      where: { id: dealId },
      include: { application: { include: { investorProfile: { include: { user: true } } } } },
    })
  }
  return prisma.deal.findFirst({
    where: { id: dealId, application: { investorProfile: { userId } } },
    include: { application: { include: { investorProfile: { include: { user: true } } } } },
  })
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ dealId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dealId } = await ctx.params
  const deal = await loadDealForUser(dealId, session.user.id, session.user.role)
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const viewings = await prisma.viewing.findMany({
    where: { dealId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({
    viewings: viewings.map((v) => ({
      id: v.id,
      requestedSlot: v.requestedSlot.toISOString(),
      alternativeSlot: v.alternativeSlot?.toISOString() ?? null,
      confirmedSlot: v.confirmedSlot?.toISOString() ?? null,
      status: v.status,
      investorNote: v.investorNote,
      adminNote: v.adminNote,
      isMine: v.investorUserId === session.user.id,
    })),
  })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ dealId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dealId } = await ctx.params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const deal = await loadDealForUser(dealId, session.user.id, session.user.role)
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  if (session.user.role === 'admin') {
    return NextResponse.json({ error: 'Admins cannot request viewings on behalf of investors.' }, { status: 403 })
  }

  const requestedSlot = new Date(parsed.data.requestedSlot)
  if (isNaN(requestedSlot.getTime()) || requestedSlot < new Date()) {
    return NextResponse.json({ error: 'Pick a future date and time.' }, { status: 400 })
  }
  const alternativeSlot = parsed.data.alternativeSlot ? new Date(parsed.data.alternativeSlot) : null
  if (alternativeSlot && isNaN(alternativeSlot.getTime())) {
    return NextResponse.json({ error: 'Invalid alternative date.' }, { status: 400 })
  }

  const pofOk = await hasActiveProofOfFunds(deal.applicationId)
  if (!pofOk) {
    return NextResponse.json(
      { error: 'Upload a recent proof of funds (bank statement or mortgage AIP within 6 months) before requesting a viewing.', code: 'POF_REQUIRED' },
      { status: 403 },
    )
  }

  await prisma.viewing.create({
    data: {
      dealId,
      investorUserId: session.user.id,
      requestedSlot,
      alternativeSlot,
      investorNote: parsed.data.investorNote || null,
    },
  })

  try {
    await sendEmail({
      to: process.env.RESEND_TO_EMAIL!,
      subject: `Viewing request — ${deal.address}`,
      html: `<p><strong>${deal.application.investorProfile.firstName}</strong> requested a viewing of <strong>${deal.address}</strong>.</p>
             <p>Preferred: ${requestedSlot.toLocaleString('en-GB')}${alternativeSlot ? `<br>Alternative: ${alternativeSlot.toLocaleString('en-GB')}` : ''}</p>
             ${parsed.data.investorNote ? `<p style="border-left:2px solid #c9a84c;padding-left:16px"><em>${parsed.data.investorNote}</em></p>` : ''}
             <p><a href="${process.env.NEXTAUTH_URL}/admin/investors/${deal.applicationId}/deals/${dealId}">Open deal →</a></p>`,
    })
  } catch (e) {
    console.error('Viewing email failed (non-fatal):', e)
  }

  return NextResponse.json({ success: true })
}
