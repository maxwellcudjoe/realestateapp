import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { z } from 'zod'

const sendSchema = z.object({
  subject: z.string().min(1).max(255),
  body: z.string().min(1).max(5000),
})

async function getDealForUser(dealId: string, userId: string) {
  return prisma.deal.findFirst({
    where: { id: dealId, application: { investorProfile: { userId } } },
    include: { application: { include: { investorProfile: { include: { user: true } } } } },
  })
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ dealId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dealId } = await ctx.params

  // Either investor on the deal OR admin role can read
  const isAdmin = session.user.role === 'admin'
  let deal = null
  if (isAdmin) {
    deal = await prisma.deal.findUnique({ where: { id: dealId }, select: { id: true } })
  } else {
    deal = await getDealForUser(dealId, session.user.id)
  }
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const messages = await prisma.message.findMany({
    where: { dealId },
    orderBy: { createdAt: 'asc' },
    include: { senderUser: { select: { id: true, role: true } } },
  })

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      subject: m.subject,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      senderRole: m.senderUser.role,
      isMine: m.senderUserId === session.user.id,
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
  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const isAdmin = session.user.role === 'admin'
  let deal = null
  if (isAdmin) {
    deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { application: { include: { investorProfile: { include: { user: true } } } } },
    })
  } else {
    deal = await getDealForUser(dealId, session.user.id)
  }
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  await prisma.message.create({
    data: {
      applicationId: deal.applicationId,
      dealId,
      senderUserId: session.user.id,
      subject: parsed.data.subject,
      body: parsed.data.body,
    },
  })

  // Notify the other side
  try {
    if (isAdmin) {
      await sendEmail({
        to: deal.application.investorProfile.user.email,
        subject: `Reply on ${deal.address}: ${parsed.data.subject}`,
        html: `<p>You have a new message about <strong>${deal.address}</strong>:</p>
               <p style="white-space:pre-wrap;border-left:2px solid #c9a84c;padding-left:16px">${parsed.data.body}</p>
               <p><a href="${process.env.NEXTAUTH_URL}/portal/deals/${dealId}">View deal →</a></p>`,
      })
    } else {
      await sendEmail({
        to: process.env.RESEND_TO_EMAIL!,
        subject: `Question on ${deal.address}: ${parsed.data.subject}`,
        html: `<p><strong>${deal.application.investorProfile.firstName}</strong> sent a message about ${deal.address}:</p>
               <p style="white-space:pre-wrap;border-left:2px solid #c9a84c;padding-left:16px">${parsed.data.body}</p>
               <p><a href="${process.env.NEXTAUTH_URL}/admin/investors/${deal.applicationId}/deals/${dealId}">Open deal →</a></p>`,
      })
    }
  } catch (e) {
    console.error('Per-deal message email failed (non-fatal):', e)
  }

  return NextResponse.json({ success: true })
}
