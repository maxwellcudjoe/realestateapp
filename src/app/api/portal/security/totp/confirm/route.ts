import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyTotpCode, generateRecoveryCodes } from '@/lib/totp'
import { z } from 'zod'

const schema = z.object({ code: z.string().min(6).max(8) })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid code' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user || !user.totpSecret) {
    return NextResponse.json({ error: 'No pending 2FA enrolment. Start over.' }, { status: 400 })
  }
  if (user.totpEnabledAt) {
    return NextResponse.json({ error: '2FA already enabled.' }, { status: 400 })
  }

  if (!(await verifyTotpCode(user.totpSecret, parsed.data.code))) {
    return NextResponse.json({ error: 'Code did not match. Try again.' }, { status: 400 })
  }

  const { plain, hashed } = await generateRecoveryCodes(10)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { totpEnabledAt: new Date() },
    }),
    prisma.recoveryCode.deleteMany({ where: { userId: user.id } }),
    prisma.recoveryCode.createMany({
      data: hashed.map((codeHash) => ({ userId: user.id, codeHash })),
    }),
  ])

  return NextResponse.json({ success: true, recoveryCodes: plain })
}
