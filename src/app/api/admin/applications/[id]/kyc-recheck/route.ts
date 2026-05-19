import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { recordAudit } from '@/lib/audit'
import { escapeHtml } from '@/lib/html-escape'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const sumsubConfigured = !!process.env.SUMSUB_APP_TOKEN && !!process.env.SUMSUB_SECRET_KEY
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      investorProfile: {
        include: { user: { select: { id: true, email: true } } },
      },
    },
  })
  if (!application) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const provider = sumsubConfigured ? 'SUMSUB' : 'MANUAL'

  const check = await prisma.kycCheck.create({
    data: {
      applicationId: application.id,
      provider,
      status: 'PENDING',
    },
  })

  // Email the investor asking them to refresh KYC docs
  const investorName = application.investorProfile.firstName
  const portalUrl = `${process.env.NEXTAUTH_URL ?? ''}/portal/documents`
  try {
    await sendEmail({
      to: application.investorProfile.user.email,
      subject: 'KYC refresh required — Rêve Bâtir Realty',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0e8d8;padding:40px">
          <h1 style="color:#c9a84c;font-size:24px;font-weight:300">KYC documents refresh</h1>
          <p>Dear ${escapeHtml(investorName)},</p>
          <p>Our compliance team has initiated a periodic KYC refresh on your account. Please re-upload up-to-date copies of:</p>
          <ul>
            <li>Photo ID (passport or driving licence)</li>
            <li>Proof of address dated within the last 3 months</li>
          </ul>
          <p style="margin:32px 0">
            <a href="${portalUrl}" style="background:#c9a84c;color:#0a0a0a;text-decoration:none;padding:14px 28px;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase">
              Upload documents
            </a>
          </p>
          <p style="font-size:12px;color:#888">This is a routine refresh required under UK Money Laundering Regulations 2017.</p>
          <hr style="border:none;border-top:1px solid #1e1e1e;margin:24px 0"/>
          <p style="font-size:12px;color:#888">Rêve Bâtir Realty — Property Deal Sourcing</p>
        </div>
      `,
    })
  } catch (e) {
    console.error('KYC re-check email failed (non-fatal):', e)
  }

  await recordAudit({
    actorUserId: session.user.id,
    actorRole: 'admin',
    action: 'KYC_RECHECK_LAUNCHED',
    resourceType: 'Application',
    resourceId: application.id,
    metadata: { provider, kycCheckId: check.id },
  })

  return NextResponse.json({ success: true, kycCheckId: check.id, provider })
}
