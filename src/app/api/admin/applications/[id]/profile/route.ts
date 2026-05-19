import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { parsePhoneNumber } from 'libphonenumber-js'
import {
  adminProfileUpdateSchema,
  touchedAmlFields,
  computeDiff,
} from '@/lib/schemas/admin-profile'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = adminProfileUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', issues: parsed.error.errors }, { status: 400 })
  }
  const { reason, ...input } = parsed.data

  // Strip undefined keys — Zod's .optional() keeps them in the object as undefined
  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) updates[k] = v
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'NO_FIELDS' }, { status: 400 })
  }

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: { investorProfile: true },
  })
  if (!application) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const amlTouched = touchedAmlFields(updates)
  if (amlTouched.length > 0 && (!reason || reason.trim().length < 3)) {
    return NextResponse.json(
      { error: 'REASON_REQUIRED', fields: amlTouched },
      { status: 400 },
    )
  }

  // Normalise specific fields before persisting
  if (typeof updates.phone === 'string') {
    try {
      const parsedPhone = parsePhoneNumber(updates.phone, 'GB')
      if (parsedPhone) updates.phone = parsedPhone.number
    } catch { /* keep as-is; schema already validated */ }
  }
  if (typeof updates.niNumber === 'string') {
    updates.niNumber = updates.niNumber.replace(/\s+/g, '').toUpperCase()
  }
  if (typeof updates.companyNumber === 'string') {
    updates.companyNumber = updates.companyNumber.replace(/\s+/g, '').toUpperCase()
  }
  if (typeof updates.vatNumber === 'string') {
    updates.vatNumber = updates.vatNumber.replace(/\s+/g, '').toUpperCase()
  }
  if (typeof updates.dateOfBirth === 'string') {
    updates.dateOfBirth = new Date(updates.dateOfBirth)
  }
  // If entity moves back to INDIVIDUAL, blank out the entity fields
  if (updates.entityType === 'INDIVIDUAL') {
    updates.companyName = null
    updates.companyNumber = null
    updates.vatNumber = null
    updates.companyAddress = null
  }

  const diff = computeDiff(application.investorProfile as unknown as Record<string, unknown>, updates)

  await prisma.investorProfile.update({
    where: { id: application.investorProfile.id },
    data: updates,
  })

  const action = amlTouched.length > 0 ? 'PROFILE_AML_EDITED_BY_ADMIN' : 'PROFILE_EDITED_BY_ADMIN'
  await recordAudit({
    actorUserId: session.user.id,
    actorRole: 'admin',
    action,
    resourceType: 'InvestorProfile',
    resourceId: application.investorProfile.id,
    metadata: {
      reason: reason ?? null,
      amlFieldsTouched: amlTouched,
      diff,
    },
  })

  return NextResponse.json({ success: true, diff })
}
