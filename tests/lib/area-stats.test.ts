import { describe, it, expect, beforeEach, vi } from 'vitest'

const { dealCountMock, propertyFindManyMock, investorStrategyCountMock } = vi.hoisted(() => ({
  dealCountMock: vi.fn(),
  propertyFindManyMock: vi.fn(),
  investorStrategyCountMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    deal: { count: dealCountMock },
    property: { findMany: propertyFindManyMock },
    investorStrategy: { count: investorStrategyCountMock },
  },
}))

import { getAreaStats, meaningfulCount } from '@/lib/area-stats'

describe('getAreaStats', () => {
  beforeEach(() => {
    dealCountMock.mockReset()
    propertyFindManyMock.mockReset()
    investorStrategyCountMock.mockReset()
  })

  it('returns aggregated stats from prisma queries', async () => {
    dealCountMock.mockResolvedValueOnce(7)
    propertyFindManyMock.mockResolvedValueOnce([
      { purchasePrice: 250_000 },
      { purchasePrice: 180_000 },
      { purchasePrice: 320_000 },
    ])
    investorStrategyCountMock.mockResolvedValueOnce(12)

    const stats = await getAreaStats('manchester', 'Manchester', 'BTL')

    expect(stats).toEqual({
      dealsLast12Months: 7,
      completedLast12Months: 3,
      totalCompletedValue: 750_000,
      activeInvestorsTargetingArea: 12,
    })
  })

  it('filters deals by strategy + city substring on address', async () => {
    dealCountMock.mockResolvedValueOnce(0)
    propertyFindManyMock.mockResolvedValueOnce([])
    investorStrategyCountMock.mockResolvedValueOnce(0)

    await getAreaStats('liverpool', 'Liverpool', 'HMO')

    expect(dealCountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          strategyTag: 'HMO',
          address: { contains: 'Liverpool' },
        }),
      }),
    )
  })

  it('queries investor strategies via structuredAreas relation on the citySlug', async () => {
    dealCountMock.mockResolvedValueOnce(0)
    propertyFindManyMock.mockResolvedValueOnce([])
    investorStrategyCountMock.mockResolvedValueOnce(0)

    await getAreaStats('leeds', 'Leeds', 'FLIP')

    expect(investorStrategyCountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          strategy: 'FLIP',
          investorProfile: { structuredAreas: { some: { code: 'leeds' } } },
        }),
      }),
    )
  })

  it('returns zeros on prisma error (graceful)', async () => {
    dealCountMock.mockRejectedValueOnce(new Error('db down'))
    const stats = await getAreaStats('manchester', 'Manchester', 'BTL')
    expect(stats).toEqual({
      dealsLast12Months: 0,
      completedLast12Months: 0,
      totalCompletedValue: 0,
      activeInvestorsTargetingArea: 0,
    })
  })

  it('handles null/undefined purchase prices safely', async () => {
    dealCountMock.mockResolvedValueOnce(2)
    propertyFindManyMock.mockResolvedValueOnce([
      { purchasePrice: 200_000 },
      { purchasePrice: null },
    ])
    investorStrategyCountMock.mockResolvedValueOnce(1)
    const stats = await getAreaStats('manchester', 'Manchester', 'BTL')
    expect(stats.totalCompletedValue).toBe(200_000)
    expect(stats.completedLast12Months).toBe(2)
  })
})

describe('meaningfulCount', () => {
  it('returns null below threshold to suppress thin-data stats', () => {
    expect(meaningfulCount(0)).toBeNull()
    expect(meaningfulCount(1)).toBeNull()
    expect(meaningfulCount(2)).toBeNull()
  })

  it('returns the count at or above threshold', () => {
    expect(meaningfulCount(3)).toBe(3)
    expect(meaningfulCount(50)).toBe(50)
  })
})
