import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { z } from 'zod'

const messageSchema = z.object({
  subject: z.string().min(1).max(255),
  body: z.string().min(1).max(5000),  // M6 fix — matches the per-deal messages route
})

async function getApplication(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      investorProfile: {
        include: { application: { select: { id: true } } },
      },
    },
  })
  return user?.investorProfile?.application ?? null
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const app = await getApplication(session.user.id)
  if (!app) return NextResponse.json({ error: 'No application found' }, { status: 404 })

  const messages = await prisma.message.findMany({
    where: { applicationId: app.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, subject: true, body: true, createdAt: true },
  })

  return NextResponse.json({ messages })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = messageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const app = await getApplication(session.user.id)
  if (!app) return NextResponse.json({ error: 'No application found' }, { status: 404 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { investorProfile: { select: { firstName: true, lastName: true } } },
  })

  const message = await prisma.message.create({
    data: {
      applicationId: app.id,
      senderUserId: session.user.id,
      subject: parsed.data.subject,
      body: parsed.data.body,
    },
  })

  const investorName = user?.investorProfile
    ? `${user.investorProfile.firstName} ${user.investorProfile.lastName}`
    : session.user.email ?? 'Investor'

  try {
    await sendEmail({
      to: process.env.RESEND_TO_EMAIL!,
      subject: `Investor message: ${parsed.data.subject}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0e8d8;padding:40px">
          <h1 style="color:#c9a84c;font-size:20px;font-weight:300">New message from investor</h1>
          <table style="font-size:13px;border-collapse:collapse;width:100%">
            <tr><td style="padding:6px 16px 6px 0;color:#888;width:100px">From</td><td style="color:#f0e8d8">${investorName}</td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#888">Email</td><td style="color:#f0e8d8">${session.user.email}</td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#888">Subject</td><td style="color:#f0e8d8">${parsed.data.subject}</td></tr>
          </table>
          <div style="margin-top:24px;padding:20px;border-left:2px solid #c9a84c;background:#1a1a1a">
            <p style="margin:0;white-space:pre-wrap;color:#f0e8d8">${parsed.data.body}</p>
          </div>
          <hr style="border:none;border-top:1px solid #1e1e1e;margin:24px 0"/>
          <p style="font-size:12px;color:#888">Rêve Bâtir Realty — Investor Portal</p>
        </div>
      `,
    })
  } catch (e) {
    console.error('Investor message notification email failed (non-fatal):', e)
  }

  return NextResponse.json({ success: true, messageId: message.id })
}
