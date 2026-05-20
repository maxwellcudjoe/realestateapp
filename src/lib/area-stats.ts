import { prisma } from '@/lib/prisma'

export interface AreaStats {
  dealsLast12Months: number
  completedLast12Months: number
  totalCompletedValue: number
  activeInvestorsTargetingArea: number
}

const MIN_DATA_POINTS_FOR_DERIVED_STAT = 3

/**
 * Live stats for a (citySlug, strategy) tuple. Returns zeros on any error —
 * pages must never crash on stats query, and a zero is rendered as a
 * "stat hidden" treatment in the UI rather than a "0" headline.
 */
export async function getAreaStats(
  citySlug: string,
  cityShort: string,
  strategyCode: 'BTL' | 'HMO' | 'FLIP',
): Promise<AreaStats> {
  try {
    const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

    const [dealsLast12Months, completedProps, investorCount] = await Promise.all([
      prisma.deal.count({
        where: {
          publishedAt: { gte: cutoff },
          strategyTag: strategyCode,
          address: { contains: cityShort },
        },
      }),
      prisma.property.findMany({
        where: {
          completionDate: { gte: cutoff },
          address: { contains: cityShort },
        },
        select: { purchasePrice: true },
      }),
      prisma.investorStrategy.count({
        where: {
          strategy: strategyCode,
          investorProfile: {
            structuredAreas: { some: { code: citySlug } },
          },
        },
      }),
    ])

    const totalCompletedValue = completedProps.reduce(
      (sum, p) => sum + Number(p.purchasePrice ?? 0),
      0,
    )

    return {
      dealsLast12Months,
      completedLast12Months: completedProps.length,
      totalCompletedValue,
      activeInvestorsTargetingArea: investorCount,
    }
  } catch {
    return {
      dealsLast12Months: 0,
      completedLast12Months: 0,
      totalCompletedValue: 0,
      activeInvestorsTargetingArea: 0,
    }
  }
}

/**
 * Conservative formatter — when n is too small to be statistically meaningful,
 * returns null so the renderer hides the stat instead of showing "0" or "1".
 */
export function meaningfulCount(n: number): number | null {
  return n >= MIN_DATA_POINTS_FOR_DERIVED_STAT ? n : null
}
