import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { z } from 'zod'

const dealSchema = z.object({
  title: z.string().min(1).max(255),
  address: z.string().min(1).max(255),
  askingPrice: z.number().positive(),
  summary: z.string().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const deals = await prisma.deal.findMany({
    where: { applicationId: params.id },
    orderBy: { createdAt: 'desc' },
    include: { response: true },
  })

  return NextResponse.json({ deals })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = dealSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const app = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      investorProfile: {
        include: { user: { select: { email: true } } },
      },
    },
  })
  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  const deal = await prisma.deal.create({
    data: {
      applicationId: params.id,
      postedByUserId: session.user.id,
      title: parsed.data.title,
      address: parsed.data.address,
      askingPrice: parsed.data.askingPrice,
      summary: parsed.data.summary,
    },
  })

  try {
    const firstName = app.investorProfile.firstName
    const investorEmail = app.investorProfile.user.email
    const priceFormatted = `£${Number(parsed.data.askingPrice).toLocaleString('en-GB')}`

    await sendEmail({
      to: investorEmail,
      subject: 'A new deal has been matched to your profile — Rêve Bâtir Realty',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0e8d8;padding:40px">
          <h1 style="color:#c9a84c;font-size:22px;font-weight:300">A new deal has been matched to your profile</h1>
          <p>Dear ${firstName},</p>
          <div style="margin:24px 0;padding:20px;background:#1a1a1a;border-left:2px solid #c9a84c">
            <p style="margin:0 0 8px;color:#c9a84c;font-size:12px;text-transform:uppercase;letter-spacing:0.1em">${parsed.data.address}</p>
            <p style="margin:0 0 8px;font-size:20px;font-weight:300">${parsed.data.title}</p>
            <p style="margin:0;color:#c9a84c;font-size:18px">${priceFormatted}</p>
            ${parsed.data.summary ? `<p style="margin:16px 0 0;color:#b3b3b3;font-size:14px">${parsed.data.summary}</p>` : ''}
          </div>
          <p>Log in to your investor portal to view the full details and submit your response.</p>
          <p><a href="${process.env.NEXTAUTH_URL}/portal/deals" style="color:#c9a84c;font-weight:bold">View Deal &amp; Respond →</a></p>
          <hr style="border:none;border-top:1px solid #1e1e1e;margin:24px 0"/>
          <p style="font-size:12px;color:#888">Rêve Bâtir Realty — Property Deal Sourcing</p>
        </div>
      `,
    })
  } catch (e) {
    console.error('Deal notification email failed (non-fatal):', e)
  }

  return NextResponse.json({ success: true, dealId: deal.id })
}
