import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { z } from 'zod'

const VALID_INTENTS = ['ACCEPT', 'MORE_INFO', 'PASS'] as const

const responseSchema = z.object({
  intent: z.enum(VALID_INTENTS),
  comment: z.string().optional(),
})

const INTENT_LABEL: Record<string, string> = {
  ACCEPT: "Interested — let's proceed",
  MORE_INFO: 'Interested — need more info',
  PASS: 'Not interested — passing',
}

async function getDealForUser(dealId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      investorProfile: {
        include: { application: { select: { id: true } } },
      },
    },
  })
  const applicationId = user?.investorProfile?.application?.id
  if (!applicationId) return null

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { response: true },
  })
  if (!deal || deal.applicationId !== applicationId) return null
  return deal
}

export async function POST(
  req: NextRequest,
  { params }: { params: { dealId: string } },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deal = await getDealForUser(params.dealId, session.user.id)
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  if (deal.response) return NextResponse.json({ error: 'Response already exists — use PUT to update' }, { status: 409 })

  const body = await req.json()
  const parsed = responseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  // H7 fix — double-click race: DealResponse.dealId @unique rejects the loser with P2002
  try {
    await prisma.dealResponse.create({
      data: {
        dealId: params.dealId,
        intent: parsed.data.intent,
        comment: parsed.data.comment ?? null,
      },
    })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Response already recorded — use PUT to update' }, { status: 409 })
    }
    throw e
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { investorProfile: { select: { firstName: true, lastName: true } } },
    })
    const investorName = user?.investorProfile
      ? `${user.investorProfile.firstName} ${user.investorProfile.lastName}`
      : (session.user.email ?? 'Investor')
    const intentLabel = INTENT_LABEL[parsed.data.intent]

    await sendEmail({
      to: process.env.RESEND_TO_EMAIL!,
      subject: `Deal response: ${intentLabel} — ${deal.title}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0e8d8;padding:40px">
          <h1 style="color:#c9a84c;font-size:20px;font-weight:300">Deal response received</h1>
          <table style="font-size:13px;border-collapse:collapse;width:100%">
            <tr><td style="padding:6px 16px 6px 0;color:#888;width:100px">Investor</td><td>${investorName}</td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#888">Deal</td><td>${deal.title}</td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#888">Response</td><td style="color:#c9a84c;font-weight:bold">${intentLabel}</td></tr>
          </table>
          ${parsed.data.comment ? `<div style="margin-top:20px;padding:16px;background:#1a1a1a;border-left:2px solid #c9a84c"><p style="margin:0">${parsed.data.comment}</p></div>` : ''}
          <hr style="border:none;border-top:1px solid #1e1e1e;margin:24px 0"/>
          <p style="font-size:12px;color:#888">Rêve Bâtir Realty — Investor Portal</p>
        </div>
      `,
    })
  } catch (e) {
    console.error('Deal response email failed (non-fatal):', e)
  }

  return NextResponse.json({ success: true })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { dealId: string } },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deal = await getDealForUser(params.dealId, session.user.id)
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  if (!deal.response) return NextResponse.json({ error: 'No response to update — use POST to create' }, { status: 404 })

  const body = await req.json()
  const parsed = responseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  await prisma.dealResponse.update({
    where: { dealId: params.dealId },
    data: { intent: parsed.data.intent, comment: parsed.data.comment ?? null },
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { dealId: string } },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deal = await getDealForUser(params.dealId, session.user.id)
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  if (!deal.response) return NextResponse.json({ error: 'No response to delete' }, { status: 404 })

  await prisma.dealResponse.delete({ where: { dealId: params.dealId } })

  return NextResponse.json({ success: true })
}
