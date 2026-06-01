import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { parseCodesJson } from './source'

/**
 * Conversion orchestrator — turns a Lead into a real User+InvestorProfile+Application,
 * or adopts an existing investor (auto-match path).
 *
 * Schema note: intent fields (budgetMin/Max, experienceLevel, timeline, fundingStatus)
 * live on `InvestorProfile` (not `Application`). The Lead's `timeline` maps to
 * `InvestorProfile.timelineToBuy`, and `fundingStatus` maps to `mortgageStatus`.
 *
 * Required InvestorProfile fields not present on the Lead are filled with sensible
 * defaults so the row can be created — the user will complete real values via the
 * finish-setup flow (Task 9). Defaults used on the magic-link path:
 *   - firstName: parsed from Lead.name (first token), lastName: remainder or '-'
 *   - addressLine1/city/postcode: '' (empty placeholders, finished later)
 *   - buyerType: 'cash' (sensible default; updated in finish-setup)
 *   - strategy: first strategy from the Lead's selection, else 'BTL'
 *   - targetAreas (legacy free-text): joined list of area codes, else ''
 *   - budgetMin/Max: from Lead if present, else 0/0
 */

export interface ConvertOptionsMagicLink {
  password: string
  consents: { gdpr: boolean }
  existingUserId?: undefined
  existingApplicationId?: undefined
  existingInvestorProfileId?: undefined
}

export interface ConvertOptionsAutoMatch {
  password?: undefined
  consents?: undefined
  existingUserId: string
  existingApplicationId: string
  existingInvestorProfileId: string
}

export type ConvertOptions = ConvertOptionsMagicLink | ConvertOptionsAutoMatch

export interface ConvertResult {
  userId: string
  applicationId: string
  email: string
  fromAutoMatch: boolean
}

function splitName(full: string): { first: string; last: string } {
  const trimmed = (full ?? '').trim()
  if (!trimmed) return { first: '-', last: '-' }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { first: parts[0], last: '-' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

export async function convertLead(leadId: string, opts: ConvertOptions): Promise<ConvertResult> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) throw new Error('Lead not found')
  if (lead.convertedUserId) throw new Error('Lead already converted')
  if (!lead.email) throw new Error('Lead email required for conversion')

  const fromAutoMatch = 'existingUserId' in opts && !!opts.existingUserId
  const leadEmail = lead.email.toLowerCase()
  const leadStrategies = parseCodesJson(lead.strategyCodesJson)
  const leadAreas = parseCodesJson(lead.targetAreaCodesJson)

  return prisma.$transaction(async (tx) => {
    let userId: string
    let applicationId: string
    let investorProfileId: string

    let resolvedEmail = leadEmail

    if (fromAutoMatch) {
      userId = opts.existingUserId
      applicationId = opts.existingApplicationId
      investorProfileId = opts.existingInvestorProfileId
      // Fetch the existing user's email so callers can auto-sign-in / send mail.
      const existingUser = await tx.user.findUnique({
        where: { id: opts.existingUserId },
        select: { email: true },
      })
      if (existingUser?.email) resolvedEmail = existingUser.email.toLowerCase()
    } else {
      const passwordHash = await bcrypt.hash(opts.password!, 12)
      const user = await tx.user.create({
        data: {
          email: leadEmail,
          passwordHash,
          role: 'investor',
          emailVerifiedAt: new Date(),
        },
      })
      userId = user.id

      const { first, last } = splitName(lead.name)
      const primaryStrategy = leadStrategies[0] ?? 'BTL'
      const legacyAreasText = leadAreas.join(', ')

      const profile = await tx.investorProfile.create({
        data: {
          userId: user.id,
          firstName: first,
          lastName: last,
          phone: lead.phone ?? '',
          addressLine1: '',
          city: '',
          postcode: '',
          budgetMin: lead.budgetMin ?? 0,
          budgetMax: lead.budgetMax ?? 0,
          strategy: primaryStrategy,
          buyerType: 'cash',
          targetAreas: legacyAreasText,
          marketingConsentAt: opts.consents?.gdpr ? new Date() : null,
          experienceLevel: lead.experienceLevel,
          timelineToBuy: lead.timeline,
          mortgageStatus: lead.fundingStatus,
        },
      })
      investorProfileId = profile.id

      const app = await tx.application.create({
        data: { investorProfileId: profile.id, status: 'SUBMITTED' },
      })
      applicationId = app.id
    }

    // Union strategies (skip dupes)
    const existingStrategies = await tx.investorStrategy.findMany({
      where: { investorProfileId },
      select: { strategy: true },
    })
    const haveStrategies = new Set(existingStrategies.map((r) => r.strategy))
    const toCreateStrategies = leadStrategies.filter((s) => !haveStrategies.has(s))
    if (toCreateStrategies.length > 0) {
      await tx.investorStrategy.createMany({
        data: toCreateStrategies.map((strategy) => ({ investorProfileId, strategy })),
      })
    }

    // Union target areas (skip dupes by code)
    const existingAreas = await tx.targetArea.findMany({
      where: { investorProfileId },
      select: { code: true },
    })
    const haveAreas = new Set(existingAreas.map((r) => r.code))
    const toCreateAreas = leadAreas.filter((c) => !haveAreas.has(c))
    if (toCreateAreas.length > 0) {
      await tx.targetArea.createMany({
        data: toCreateAreas.map((code) => ({ investorProfileId, code, label: code })),
      })
    }

    // Auto-match: fill scalar intent gaps on the existing InvestorProfile (user wins on conflict).
    if (fromAutoMatch) {
      const existingProfile = await tx.investorProfile.findUnique({
        where: { id: investorProfileId },
        select: {
          timelineToBuy: true,
          experienceLevel: true,
          mortgageStatus: true,
          budgetMin: true,
          budgetMax: true,
        },
      })
      const patch: Record<string, unknown> = {}
      if (!existingProfile?.timelineToBuy && lead.timeline) patch.timelineToBuy = lead.timeline
      if (!existingProfile?.experienceLevel && lead.experienceLevel) patch.experienceLevel = lead.experienceLevel
      if (!existingProfile?.mortgageStatus && lead.fundingStatus) patch.mortgageStatus = lead.fundingStatus
      if ((existingProfile?.budgetMin == null) && lead.budgetMin != null) patch.budgetMin = lead.budgetMin
      if ((existingProfile?.budgetMax == null) && lead.budgetMax != null) patch.budgetMax = lead.budgetMax
      if (Object.keys(patch).length > 0) {
        await tx.investorProfile.update({ where: { id: investorProfileId }, data: patch })
      }
    }

    await tx.lead.update({
      where: { id: leadId },
      data: { convertedUserId: userId, convertedAt: new Date(), status: 'CONVERTED' },
    })

    await tx.auditEvent.create({
      data: {
        action: fromAutoMatch ? 'LEAD_AUTO_MERGED' : 'LEAD_CONVERTED',
        actorUserId: userId,
        resourceType: 'Lead',
        resourceId: leadId,
        metadata: JSON.stringify({
          userId,
          applicationId,
          fromAutoMatch,
          unionedStrategies: toCreateStrategies,
          unionedAreas: toCreateAreas,
        }),
      },
    })

    return { userId, applicationId, email: resolvedEmail, fromAutoMatch }
  })
}
