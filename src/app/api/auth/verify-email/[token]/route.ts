import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params
  const base = process.env.NEXTAUTH_URL ?? ''

  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!record) {
    return NextResponse.redirect(`${base}/login?verifyError=invalid`)
  }
  if (record.usedAt) {
    // Already consumed — but if the user is now verified, treat as success.
    if (record.user.emailVerifiedAt) {
      return NextResponse.redirect(`${base}/login?verified=1`)
    }
    return NextResponse.redirect(`${base}/login?verifyError=used`)
  }
  if (record.expiresAt < new Date()) {
    return NextResponse.redirect(`${base}/login?verifyError=expired`)
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ])

  return NextResponse.redirect(`${base}/login?verified=1`)
}
