import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { getClientIp } from '@/lib/rate-limit'
import { encodeCodesJson, isValidSourceChannel, isValidStatus } from '@/lib/leads/source'

const CreateBody = z
  .object({
    name: z.string().min(1).max(120),
    email: z.string().email().optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    sourceChannel: z.string().refine(isValidSourceChannel, 'invalid source channel'),
    sourceReferrer: z.string().max(120).optional().nullable(),
    sourceNote: z.string().max(5000).optional().nullable(),
    strategyCodes: z.array(z.string()).optional().default([]),
    targetAreaCodes: z.array(z.string()).optional().default([]),
    budgetMin: z.number().nonnegative().optional().nullable(),
    budgetMax: z.number().nonnegative().optional().nullable(),
    experienceLevel: z.string().max(20).optional().nullable(),
    timeline: z.string().max(20).optional().nullable(),
    fundingStatus: z.string().max(20).optional().nullable(),
  })
  .refine((d) => Boolean(d.email || d.phone), { message: 'email or phone required' })

export async function POST(req: NextRequest | Request): Promise<Response> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = CreateBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  const lead = await prisma.lead.create({
    data: {
      createdByUserId: session.user.id,
      name: d.name,
      email: d.email ? d.email.toLowerCase() : null,
      phone: d.phone ?? null,
      sourceChannel: d.sourceChannel,
      sourceReferrer: d.sourceReferrer ?? null,
      sourceNote: d.sourceNote ?? null,
      strategyCodesJson: encodeCodesJson(d.strategyCodes),
      targetAreaCodesJson: encodeCodesJson(d.targetAreaCodes),
      budgetMin: d.budgetMin ?? null,
      budgetMax: d.budgetMax ?? null,
      experienceLevel: d.experienceLevel ?? null,
      timeline: d.timeline ?? null,
      fundingStatus: d.fundingStatus ?? null,
    },
  })

  await recordAudit({
    action: 'LEAD_CREATED',
    resourceType: 'Lead',
    resourceId: lead.id,
    metadata: { sourceChannel: d.sourceChannel, name: d.name },
    ipAddress: getClientIp(req as NextRequest),
  })

  return NextResponse.json({ ok: true, lead })
}

export async function GET(req: NextRequest | Request): Promise<Response> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const statusParam = url.searchParams.get('status')
  const where: Record<string, unknown> = {}
  if (statusParam && isValidStatus(statusParam)) where.status = statusParam

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json({ ok: true, leads })
}
