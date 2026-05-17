import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { email } = body as { email?: string }
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // Always return success — never reveal whether an email exists
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })

  if (user) {
    // Invalidate any existing tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    })

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

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
            <h1 style="color:#c9a84c;font-size:24px;font-weight:300">Reset Your Password</h1>
            <p>You requested a password reset for your Rêve Bâtir Realty investor account.</p>
            <p>Click the link below to set a new password. This link expires in <strong>1 hour</strong>.</p>
            <p style="margin:32px 0">
              <a href="${resetUrl}" style="background:#c9a84c;color:#0a0a0a;text-decoration:none;padding:14px 28px;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase">
                Reset Password
              </a>
            </p>
            <p style="font-size:12px;color:#888">If you did not request this, you can safely ignore this email. Your password will not change.</p>
            <hr style="border:none;border-top:1px solid #1e1e1e;margin:24px 0"/>
            <p style="font-size:12px;color:#888">Rêve Bâtir Realty — Property Deal Sourcing</p>
          </div>
        `,
      })
    } catch (e) {
      console.error('Reset email failed:', e)
    }
  }

  return NextResponse.json({ success: true })
}
