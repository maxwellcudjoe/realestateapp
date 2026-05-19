import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'

export async function POST(_req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const user = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!user.deletedAt) {
    return NextResponse.json({ error: 'User is not soft-deleted' }, { status: 409 })
  }
  if (user.anonymisedAt) {
    return NextResponse.json({ error: 'ANONYMISED', message: 'User has been anonymised and cannot be restored' }, { status: 410 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { deletedAt: null, deletionReason: null },
  })

  await recordAudit({
    actorUserId: session.user.id,
    actorRole: 'admin',
    action: 'USER_RESTORED',
    resourceType: 'User',
    resourceId: user.id,
  })

  return NextResponse.json({ success: true })
}
