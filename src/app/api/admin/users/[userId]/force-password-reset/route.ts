import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { recordAudit } from '@/lib/audit'
import crypto from 'crypto'

export async function POST(_req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const user = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60)
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  })

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`
  try {
    await sendEmail({
      to: user.email,
      subject: 'Reset your password — Rêve Bâtir Realty',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0e8d8;padding:40px">
          <h1 style="color:#c9a84c;font-size:24px;font-weight:300">Password Reset Requested</h1>
          <p>Our team has initiated a password reset for your Rêve Bâtir Realty investor account.</p>
          <p>Click the link below to set a new password. This link expires in <strong>1 hour</strong>.</p>
          <p style="margin:32px 0">
            <a href="${resetUrl}" style="background:#c9a84c;color:#0a0a0a;text-decoration:none;padding:14px 28px;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase">
              Reset Password
            </a>
          </p>
          <p style="font-size:12px;color:#888">If you did not expect this, please contact us — your existing password is still active until you complete the reset.</p>
          <hr style="border:none;border-top:1px solid #1e1e1e;margin:24px 0"/>
          <p style="font-size:12px;color:#888">Rêve Bâtir Realty — Property Deal Sourcing</p>
        </div>
      `,
    })
  } catch (e) {
    console.error('Admin force-reset email failed (non-fatal):', e)
  }

  await recordAudit({
    actorUserId: session.user.id,
    actorRole: 'admin',
    action: 'PASSWORD_RESET_FORCED',
    resourceType: 'User',
    resourceId: user.id,
  })

  return NextResponse.json({ success: true })
}
