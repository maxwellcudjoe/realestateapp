import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { profileUpdateSchema } from '@/lib/schemas/profile'
import { areaLabel } from '@/lib/target-areas'
import { recordAudit } from '@/lib/audit'
import { getClientIp } from '@/lib/rate-limit'
import { parsePhoneNumber } from 'libphonenumber-js'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.investorProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      structuredAreas: { orderBy: { label: 'asc' } },
      strategies: true,
    },
  })
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  return NextResponse.json({
    phone: profile.phone,
    addressLine1: profile.addressLine1,
    city: profile.city,
    postcode: profile.postcode,
    budgetMin: Number(profile.budgetMin),
    budgetMax: Number(profile.budgetMax),
    strategies: profile.strategies.map((s) => s.strategy),
    buyerType: profile.buyerType,
    targetAreaCodes: profile.structuredAreas.map((a) => a.code),
    experienceLevel: profile.experienceLevel ?? '',
    timelineToBuy: profile.timelineToBuy ?? '',
    mortgageStatus: profile.mortgageStatus ?? 'NONE',
    mortgageLender: profile.mortgageLender ?? '',
    maxLtv: profile.maxLtv ?? undefined,
    depositAvailable: profile.depositAvailable ? Number(profile.depositAvailable) : undefined,
    referralSource: profile.referralSource ?? '',
    taxResidency: profile.taxResidency ?? 'GB',
    niNumber: profile.niNumber ?? '',
    sourceOfFunds: profile.sourceOfFunds ?? '',
    sourceOfFundsDetail: profile.sourceOfFundsDetail ?? '',
    marketingConsent: Boolean(profile.marketingConsentAt),
    // Read-only fields for display
    locked: {
      email: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      dateOfBirth: profile.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      nationality: profile.nationality ?? null,
      isPep: profile.isPep,
    },
  })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = profileUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 422 })
  }
  const d = parsed.data

  const profile = await prisma.investorProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, marketingConsentAt: true },
  })
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Normalise phone to E.164
  let normalisedPhone = d.phone
  try {
    const parsedPhone = parsePhoneNumber(d.phone, 'GB')
    if (parsedPhone?.isValid()) normalisedPhone = parsedPhone.number
  } catch { /* ignore */ }

  await prisma.$transaction([
    prisma.investorProfile.update({
      where: { id: profile.id },
      data: {
        phone: normalisedPhone,
        addressLine1: d.addressLine1,
        city: d.city,
        postcode: d.postcode,
        budgetMin: d.budgetMin,
        budgetMax: d.budgetMax,
        strategy: d.strategies[0] ?? 'BTL',
        buyerType: d.buyerType,
        targetAreas: d.targetAreaCodes.map(areaLabel).join(', '),
        experienceLevel: d.experienceLevel,
        timelineToBuy: d.timelineToBuy,
        mortgageStatus: d.buyerType === 'mortgage' ? d.mortgageStatus : null,
        mortgageLender: d.buyerType === 'mortgage' && d.mortgageLender ? d.mortgageLender : null,
        maxLtv: d.buyerType === 'mortgage' && typeof d.maxLtv === 'number' ? d.maxLtv : null,
        depositAvailable: typeof d.depositAvailable === 'number' ? d.depositAvailable : null,
        referralSource: d.referralSource || null,
        taxResidency: d.taxResidency,
        niNumber: d.niNumber?.replace(/\s+/g, '').toUpperCase() || null,
        sourceOfFunds: d.sourceOfFunds,
        sourceOfFundsDetail: d.sourceOfFunds === 'OTHER' ? d.sourceOfFundsDetail : null,
        marketingConsentAt: d.marketingConsent
          ? (profile.marketingConsentAt ?? new Date())
          : null,
        complianceCompleted: true, // any successful update marks them complete
      },
    }),
    prisma.targetArea.deleteMany({ where: { investorProfileId: profile.id } }),
    prisma.targetArea.createMany({
      data: d.targetAreaCodes.map((code) => ({
        investorProfileId: profile.id, code, label: areaLabel(code),
      })),
    }),
    prisma.investorStrategy.deleteMany({ where: { investorProfileId: profile.id } }),
    prisma.investorStrategy.createMany({
      data: d.strategies.map((strategy) => ({ investorProfileId: profile.id, strategy })),
    }),
  ])

  await recordAudit({
    actorUserId: session.user.id,
    actorRole: 'investor',
    action: 'PROFILE_UPDATED',
    resourceType: 'InvestorProfile',
    resourceId: profile.id,
    ipAddress: getClientIp(req),
  })

  return NextResponse.json({ success: true })
}
