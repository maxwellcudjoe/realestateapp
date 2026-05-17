import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { getClientIp } from '@/lib/rate-limit'
import { z } from 'zod'

const schema = z.object({
  reviewStatus: z.enum(['APPROVED', 'REJECTED', 'PENDING']),
  reviewNote: z.string().max(1000).optional().default(''),
  expiresAt: z.string().optional().default(''),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const doc = await prisma.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.document.update({
    where: { id },
    data: {
      reviewStatus: parsed.data.reviewStatus,
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
      reviewNote: parsed.data.reviewNote || null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : doc.expiresAt,
    },
  })

  await recordAudit({
    actorUserId: session.user.id,
    actorRole: session.user.role,
    action: parsed.data.reviewStatus === 'APPROVED' ? 'DEAL_DOC_UPLOADED' : 'DEAL_DOC_DELETED',  // closest enum (will expand action set later if needed)
    resourceType: 'Document',
    resourceId: id,
    metadata: { reviewStatus: parsed.data.reviewStatus, note: parsed.data.reviewNote || null },
    ipAddress: getClientIp(req),
  })

  return NextResponse.json({ success: true })
}
