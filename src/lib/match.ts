// Deal → Investor matching. Uses Phase 1 nationality + Task 2.1 structured areas + Task 2.2 strategies.

import { prisma } from '@/lib/prisma'

export interface MatchCriteria {
  /** Asking price in £ — investor's budget range must overlap. */
  price: number
  /** Area code from the curated TARGET_AREAS catalog (or undefined to skip area filter). */
  areaCode?: string
  /** Strategy code (BTL/HMO/FLIP/COMMERCIAL/SERVICED_ACCOM) — undefined to skip strategy filter. */
  strategyCode?: string
}

export interface MatchedInvestor {
  applicationId: string
  investorProfileId: string
  userId: string
  email: string
  firstName: string
  lastName: string
  budgetMin: number
  budgetMax: number
  buyerType: string
  entityType: string
  strategies: string[]
  areaCodes: string[]
}

/**
 * Find ACTIVE_INVESTOR applications whose budget range contains the asking price,
 * optionally filtered by structured area + strategy. Deleted users excluded.
 */
export async function findMatchingInvestors(criteria: MatchCriteria): Promise<MatchedInvestor[]> {
  const { price, areaCode, strategyCode } = criteria

  const profiles = await prisma.investorProfile.findMany({
    where: {
      budgetMin: { lte: price },
      budgetMax: { gte: price },
      user: { deletedAt: null },
      application: { status: 'ACTIVE_INVESTOR' },
      ...(areaCode ? { structuredAreas: { some: { code: areaCode } } } : {}),
      ...(strategyCode ? { strategies: { some: { strategy: strategyCode } } } : {}),
    },
    include: {
      user: { select: { id: true, email: true } },
      application: { select: { id: true } },
      structuredAreas: { select: { code: true } },
      strategies: { select: { strategy: true } },
    },
    orderBy: [{ updatedAt: 'desc' }],
  })

  return profiles
    .filter((p) => p.application)
    .map((p) => ({
      applicationId: p.application!.id,
      investorProfileId: p.id,
      userId: p.user.id,
      email: p.user.email,
      firstName: p.firstName,
      lastName: p.lastName,
      budgetMin: Number(p.budgetMin),
      budgetMax: Number(p.budgetMax),
      buyerType: p.buyerType,
      entityType: p.entityType,
      strategies: p.strategies.map((s) => s.strategy),
      areaCodes: p.structuredAreas.map((a) => a.code),
    }))
}
