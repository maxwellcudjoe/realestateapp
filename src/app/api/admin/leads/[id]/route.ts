import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { getClientIp } from '@/lib/rate-limit'
import { encodeCodesJson, isValidSourceChannel, isValidStatus } from '@/lib/leads/source'

const UpdateBody = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  sourceChannel: z.string().refine(isValidSourceChannel).optional(),
  sourceReferrer: z.string().max(120).optional().nullable(),
  sourceNote: z.string().max(5000).optional().nullable(),
  strategyCodes: z.array(z.string()).optional(),
  targetAreaCodes: z.array(z.string()).optional(),
  budgetMin: z.number().nonnegative().optional().nullable(),
  budgetMax: z.number().nonnegative().optional().nullable(),
  experienceLevel: z.string().max(20).optional().nullable(),
  timeline: z.string().max(20).optional().nullable(),
  fundingStatus: z.string().max(20).optional().nullable(),
  status: z.string().refine(isValidStatus, 'invalid status').optional(),
})

export async function PATCH(req: NextRequest | Request, ctx: { params: { id: string } }): Promise<Response> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = ctx.params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = UpdateBody.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })

  const existing = await prisma.lead.findUnique({ where: { id }, select: { id: true, status: true } })
  if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const d = parsed.data
  const data: Record<string, unknown> = {}
  if (d.name !== undefined) data.name = d.name
  if (d.email !== undefined) data.email = d.email ? d.email.toLowerCase() : null
  if (d.phone !== undefined) data.phone = d.phone
  if (d.sourceChannel !== undefined) data.sourceChannel = d.sourceChannel
  if (d.sourceReferrer !== undefined) data.sourceReferrer = d.sourceReferrer
  if (d.sourceNote !== undefined) data.sourceNote = d.sourceNote
  if (d.strategyCodes !== undefined) data.strategyCodesJson = encodeCodesJson(d.strategyCodes)
  if (d.targetAreaCodes !== undefined) data.targetAreaCodesJson = encodeCodesJson(d.targetAreaCodes)
  if (d.budgetMin !== undefined) data.budgetMin = d.budgetMin
  if (d.budgetMax !== undefined) data.budgetMax = d.budgetMax
  if (d.experienceLevel !== undefined) data.experienceLevel = d.experienceLevel
  if (d.timeline !== undefined) data.timeline = d.timeline
  if (d.fundingStatus !== undefined) data.fundingStatus = d.fundingStatus
  if (d.status !== undefined) data.status = d.status

  const lead = await prisma.lead.update({ where: { id }, data })

  const ip = getClientIp(req as NextRequest)
  if (d.status !== undefined && d.status !== existing.status) {
    await recordAudit({
      action: 'LEAD_STATUS_CHANGED',
      resourceType: 'Lead',
      resourceId: id,
      metadata: { from: existing.status, to: d.status },
      ipAddress: ip,
    })
  } else {
    await recordAudit({
      action: 'LEAD_UPDATED',
      resourceType: 'Lead',
      resourceId: id,
      metadata: { fields: Object.keys(data) },
      ipAddress: ip,
    })
  }

  return NextResponse.json({ ok: true, lead })
}
