import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  currentValueEstimate: z.number().nonnegative().optional().nullable(),
  tenancyStatus: z.enum(['VACANT', 'TENANTED', 'OWN_USE']).optional(),
  monthlyRent: z.number().nonnegative().optional().nullable(),
  tenancyStart: z.string().optional().nullable(),
  tenancyEnd: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
})

async function loadOwned(propertyId: string, userId: string) {
  return prisma.property.findFirst({ where: { id: propertyId, userId } })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ propertyId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { propertyId } = await ctx.params
  const property = await loadOwned(propertyId, session.user.id)
  if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  const d = parsed.data

  const valueChanged = d.currentValueEstimate !== undefined && Number(d.currentValueEstimate) !== Number(property.currentValueEstimate ?? 0)

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      currentValueEstimate: d.currentValueEstimate ?? property.currentValueEstimate,
      currentValueUpdatedAt: valueChanged ? new Date() : property.currentValueUpdatedAt,
      tenancyStatus: d.tenancyStatus ?? property.tenancyStatus,
      monthlyRent: d.monthlyRent === null ? null : (d.monthlyRent ?? property.monthlyRent),
      tenancyStart: d.tenancyStart === null ? null : d.tenancyStart ? new Date(d.tenancyStart) : property.tenancyStart,
      tenancyEnd: d.tenancyEnd === null ? null : d.tenancyEnd ? new Date(d.tenancyEnd) : property.tenancyEnd,
      notes: d.notes === null ? null : (d.notes ?? property.notes),
    },
  })

  return NextResponse.json({ success: true })
}
