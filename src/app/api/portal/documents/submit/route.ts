import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'

const REQUIRED_TYPES = ['PASSPORT', 'PROOF_OF_ADDRESS', 'SOURCE_OF_FUNDS']

export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      investorProfile: {
        include: {
          application: { include: { documents: true } },
        },
      },
    },
  })

  const app = user?.investorProfile?.application
  if (!app || app.status !== 'DOCUMENTS_REQUESTED') {
    return NextResponse.json({ error: 'Cannot submit documents at this stage' }, { status: 403 })
  }

  const uploadedTypes = app.documents.map((d) => d.type)
  const missing = REQUIRED_TYPES.filter((t) => !uploadedTypes.includes(t))
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing documents: ${missing.join(', ')}` },
      { status: 400 },
    )
  }

  await prisma.application.update({
    where: { id: app.id },
    data: { status: 'DOCUMENTS_RECEIVED' },
  })

  await prisma.statusHistory.create({
    data: {
      applicationId: app.id,
      fromStatus: 'DOCUMENTS_REQUESTED',
      toStatus: 'DOCUMENTS_RECEIVED',
      note: 'All documents submitted by investor',
    },
  })

  try {
    const name = `${user!.investorProfile!.firstName} ${user!.investorProfile!.lastName}`
    await Promise.all([
      sendEmail({
        to: user!.email,
        subject: 'Documents received — KYC review in progress',
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0e8d8;padding:40px">
            <h1 style="color:#c9a84c;font-size:24px;font-weight:300">Documents Received</h1>
            <p>Dear ${user!.investorProfile!.firstName},</p>
            <p>We have received all your documents and our team will now carry out the KYC review. We aim to complete this within 5 business days.</p>
            <p style="font-size:12px;color:#888">Rêve Bâtir Realty</p>
          </div>
        `,
      }),
      sendEmail({
        to: 'info@revebatir.co.uk',
        subject: `Documents ready for review — ${name}`,
        html: `<p>Investor <strong>${name}</strong> has submitted all KYC documents.</p><p><a href="${process.env.NEXTAUTH_URL}/admin/investors/${app.id}">Review in dashboard →</a></p>`,
      }),
    ])
  } catch (e) {
    console.error('Email send failed (non-fatal):', e)
  }

  return NextResponse.json({ success: true })
}
