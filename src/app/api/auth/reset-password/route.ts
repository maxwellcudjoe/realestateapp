import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPasswordBreached } from '@/lib/password'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/\d/, 'Password must include a number')
    .regex(/[^A-Za-z0-9]/, 'Password must include a symbol'),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    )
  }

  const { token, password } = parsed.data

  const breach = await checkPasswordBreached(password)
  if (breach.pwned) {
    return NextResponse.json(
      { error: `This password has appeared in ${breach.count.toLocaleString()} known data breaches. Please choose a different one.` },
      { status: 400 },
    )
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!resetToken) {
    return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 })
  }
  if (resetToken.usedAt) {
    return NextResponse.json({ error: 'This reset link has already been used.' }, { status: 400 })
  }
  if (resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This reset link has expired. Please request a new one.' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { passwordHash },
  })

  await prisma.passwordResetToken.update({
    where: { token },
    data: { usedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
