import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { getClientIp } from '@/lib/rate-limit'

/**
 * Audit PR #4 (H2) — admin DELETE for properties.
 *
 * Required when rolling a deal back from COMPLETED to a non-terminal state:
 * the auto-created Property must be removed first so the investor's portfolio
 * stays consistent. PropertyDocument rows cascade via the schema.
 *
 * Only admin can hit this — investors should not delete their own properties
 * (would orphan deal history); the investor-scoped route at
 * /api/portal/properties/[propertyId] is PATCH-only.
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ propertyId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { propertyId } = await ctx.params
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, userId: true, dealId: true, address: true },
  })
  if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.property.delete({ where: { id: propertyId } })

  await recordAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: 'PROPERTY_DELETED',
    resourceType: 'Property',
    resourceId: propertyId,
    metadata: { dealId: property.dealId, userId: property.userId, address: property.address },
    ipAddress: getClientIp(req),
  })

  return NextResponse.json({ success: true })
}
