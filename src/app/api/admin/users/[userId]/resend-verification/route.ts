import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { verificationEmailHtml } from '@/lib/emails/verification'
import { recordAudit } from '@/lib/audit'
import crypto from 'crypto'

export async function POST(_req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    include: { investorProfile: { select: { firstName: true } } },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.emailVerifiedAt) {
    return NextResponse.json({ error: 'Email already verified' }, { status: 409 })
  }

  await prisma.emailVerificationToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24)
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
    console.error('Admin resend-verification email failed (non-fatal):', e)
  }

  await recordAudit({
    actorUserId: session.user.id,
    actorRole: 'admin',
    action: 'VERIFICATION_RESENT',
    resourceType: 'User',
    resourceId: user.id,
  })

  return NextResponse.json({ success: true })
}
