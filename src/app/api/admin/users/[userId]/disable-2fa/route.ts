import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  reason: z.string().min(3).max(500),
})

export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'REASON_REQUIRED', message: parsed.error.errors[0].message }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!user.totpEnabledAt) {
    return NextResponse.json({ error: '2FA not enabled' }, { status: 409 })
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null, totpEnabledAt: null },
    }),
    prisma.recoveryCode.deleteMany({ where: { userId: user.id } }),
  ])

  await recordAudit({
    actorUserId: session.user.id,
    actorRole: 'admin',
    action: 'TWOFA_DISABLED_BY_ADMIN',
    resourceType: 'User',
    resourceId: user.id,
    metadata: { reason: parsed.data.reason },
  })

  return NextResponse.json({ success: true })
}
