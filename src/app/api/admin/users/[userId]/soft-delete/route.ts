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

  // Cannot soft-delete yourself or another admin
  if (params.userId === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.role === 'admin') {
    return NextResponse.json({ error: 'Cannot soft-delete an admin account' }, { status: 400 })
  }
  if (user.deletedAt) {
    return NextResponse.json({ error: 'User already soft-deleted' }, { status: 409 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { deletedAt: new Date(), deletionReason: parsed.data.reason },
  })

  await recordAudit({
    actorUserId: session.user.id,
    actorRole: 'admin',
    action: 'USER_SOFT_DELETED',
    resourceType: 'User',
    resourceId: user.id,
    metadata: { reason: parsed.data.reason },
  })

  return NextResponse.json({ success: true })
}
