import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { verificationEmailHtml } from '@/lib/emails/verification'
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

  // Always return success — never reveal whether an account exists or its state.
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { investorProfile: true },
  })

  if (user && !user.emailVerifiedAt) {
    // Invalidate any existing unused tokens for this user
    await prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    })

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours

    await prisma.emailVerificationToken.create({
      data: { userId: user.id, token, expiresAt },
    })

    const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email/${token}`

    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify your email — Rêve Bâtir Realty',
        html: verificationEmailHtml({
          firstName: user.investorProfile?.firstName ?? 'investor',
          verifyUrl,
        }),
      })
    } catch (e) {
      console.error('Verification email failed:', e)
    }
  }

  return NextResponse.json({ success: true })
}
