import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { z } from 'zod'

const VALID_STATUSES = [
  'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUESTED', 'DOCUMENTS_RECEIVED',
  'KYC_APPROVED', 'ACTIVE_INVESTOR', 'DEAL_SENT',
]

const EMAIL_SUBJECTS: Record<string, string> = {
  SUBMITTED: 'Application received — Rêve Bâtir Realty',
  UNDER_REVIEW: 'Your application is under review',
  DOCUMENTS_REQUESTED: 'Action required: please upload your documents',
  DOCUMENTS_RECEIVED: 'Documents received — KYC review in progress',
  KYC_APPROVED: 'KYC approved — welcome to Rêve Bâtir Realty',
  ACTIVE_INVESTOR: 'You\'re now an active investor',
  DEAL_SENT: 'A deal has been matched to your criteria',
}

const statusUpdateSchema = z.object({
  status: z.string().refine((s) => VALID_STATUSES.includes(s)),
  note: z.string().optional().default(''),
  adminNotes: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = statusUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { status: newStatus, note, adminNotes } = parsed.data

  const app = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      investorProfile: {
        include: { user: { select: { email: true } } },
      },
    },
  })

  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const oldStatus = app.status

  const updateData: any = { status: newStatus }
  if (adminNotes !== undefined) updateData.adminNotes = adminNotes

  await prisma.application.update({
    where: { id: params.id },
    data: updateData,
  })

  await prisma.statusHistory.create({
    data: {
      applicationId: params.id,
      fromStatus: oldStatus,
      toStatus: newStatus,
      changedByUserId: session.user.id,
      note: note || null,
    },
  })

  try {
    const firstName = app.investorProfile.firstName
    const investorEmail = app.investorProfile.user.email
    const subject = EMAIL_SUBJECTS[newStatus] || `Application status update — Rêve Bâtir Realty`

    let cta = ''
    if (newStatus === 'DOCUMENTS_REQUESTED') {
      cta = `<p><a href="${process.env.NEXTAUTH_URL}/portal/documents" style="color:#c9a84c;font-weight:bold">Upload your documents →</a></p>`
    }

    await sendEmail({
      to: investorEmail,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0e8d8;padding:40px">
          <h1 style="color:#c9a84c;font-size:24px;font-weight:300">${subject}</h1>
          <p>Dear ${firstName},</p>
          ${note ? `<blockquote style="border-left:2px solid #c9a84c;padding-left:16px;margin:16px 0;color:#888;font-style:italic">${note}</blockquote>` : ''}
          ${cta}
          <p>You can view your full application status at <a href="${process.env.NEXTAUTH_URL}/portal/status" style="color:#c9a84c">your investor portal</a>.</p>
          <hr style="border:none;border-top:1px solid #1e1e1e;margin:24px 0"/>
          <p style="font-size:12px;color:#888">Rêve Bâtir Realty — Property Deal Sourcing</p>
        </div>
      `,
    })
  } catch (e) {
    console.error('Status notification email failed (non-fatal):', e)
  }

  return NextResponse.json({ success: true, status: newStatus })
}
