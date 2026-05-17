import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkPasswordBreached } from '@/lib/password'
import { recordAudit } from '@/lib/audit'
import { getClientIp } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/\d/, 'Password must include a number')
    .regex(/[^A-Za-z0-9]/, 'Password must include a symbol'),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors.newPassword?.[0]
          ?? parsed.error.flatten().fieldErrors.currentPassword?.[0]
          ?? 'Invalid request' },
      { status: 400 },
    )
  }

  const { currentPassword, newPassword } = parsed.data

  if (currentPassword === newPassword) {
    return NextResponse.json({ error: 'New password must differ from current.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 })
  }

  const breach = await checkPasswordBreached(newPassword)
  if (breach.pwned) {
    return NextResponse.json(
      { error: `This password has appeared in ${breach.count.toLocaleString()} known data breaches. Please choose a different one.` },
      { status: 400 },
    )
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })

  await recordAudit({
    actorUserId: user.id,
    actorRole: 'investor',
    action: 'PASSWORD_CHANGED',
    resourceType: 'User',
    resourceId: user.id,
    ipAddress: getClientIp(req),
  })

  return NextResponse.json({ success: true })
}
