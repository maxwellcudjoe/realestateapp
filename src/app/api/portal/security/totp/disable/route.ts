import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyTotpCode, findMatchingRecoveryCode } from '@/lib/totp'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const schema = z.object({
  password: z.string().min(1),
  code: z.string().min(6).max(11), // TOTP 6 digits or recovery code XXXXX-XXXXX
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { recoveryCodes: { where: { usedAt: null } } },
  })
  if (!user || !user.totpEnabledAt || !user.totpSecret) {
    return NextResponse.json({ error: '2FA is not enabled.' }, { status: 400 })
  }

  if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: 'Password did not match.' }, { status: 400 })
  }

  const codeOk =
    (await verifyTotpCode(user.totpSecret, parsed.data.code)) ||
    (await findMatchingRecoveryCode(parsed.data.code, user.recoveryCodes)) !== null

  if (!codeOk) {
    return NextResponse.json({ error: 'Code did not match.' }, { status: 400 })
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null, totpEnabledAt: null },
    }),
    prisma.recoveryCode.deleteMany({ where: { userId: user.id } }),
  ])

  return NextResponse.json({ success: true })
}
