import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockUserFindUnique, mockDealFindFirst, mockDealFindUnique,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockDealFindFirst: vi.fn(),
  mockDealFindUnique: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    deal: { findFirst: mockDealFindFirst, findUnique: mockDealFindUnique },
  },
}))

import { getInvestorDeal, getAdminDeal, getDealForViewer } from '@/lib/deal-access'

describe('deal-access lib', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('getInvestorDeal', () => {
    it('returns null when the user does not exist', async () => {
      mockUserFindUnique.mockResolvedValue(null)
      const result = await getInvestorDeal('d1', 'unknown-user')
      expect(result).toBeNull()
      expect(mockDealFindFirst).not.toHaveBeenCalled()
    })

    it('passes a PREMIUM-tier visibility filter when user is PREMIUM', async () => {
      mockUserFindUnique.mockResolvedValue({ tier: 'PREMIUM', subscription: null })
      mockDealFindFirst.mockResolvedValue({ id: 'd1' })
      await getInvestorDeal('d1', 'u1')
      const where = mockDealFindFirst.mock.calls[0][0].where
      const cutoffClause = where.AND[2].OR.find((c: any) => c.publishedAt?.lte)
      // PREMIUM cutoff is `now` (within a second)
      const now = Date.now()
      expect(Math.abs(cutoffClause.publishedAt.lte.getTime() - now)).toBeLessThan(5000)
    })

    it('passes a FREE-tier visibility filter (48h cutoff) when user is FREE', async () => {
      mockUserFindUnique.mockResolvedValue({ tier: 'FREE', subscription: null })
      mockDealFindFirst.mockResolvedValue({ id: 'd1' })
      await getInvestorDeal('d1', 'u1')
      const where = mockDealFindFirst.mock.calls[0][0].where
      const cutoffClause = where.AND[2].OR.find((c: any) => c.publishedAt?.lte)
      const expected = Date.now() - 48 * 60 * 60 * 1000
      expect(Math.abs(cutoffClause.publishedAt.lte.getTime() - expected)).toBeLessThan(5000)
    })

    it('treats a PREMIUM user whose subscription was cancelled-but-not-expired as PREMIUM (C7)', async () => {
      mockUserFindUnique.mockResolvedValue({
        tier: 'PREMIUM',
        subscription: { cancelledAt: new Date(Date.now() - 24 * 60 * 60 * 1000), nextRenewalAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
      })
      mockDealFindFirst.mockResolvedValue({ id: 'd1' })
      await getInvestorDeal('d1', 'u1')
      const where = mockDealFindFirst.mock.calls[0][0].where
      const cutoffClause = where.AND[2].OR.find((c: any) => c.publishedAt?.lte)
      // PREMIUM cutoff is `now` (no 48h subtraction)
      expect(Math.abs(cutoffClause.publishedAt.lte.getTime() - Date.now())).toBeLessThan(5000)
    })

    it('always scopes to the requesting user via investorProfile.userId', async () => {
      mockUserFindUnique.mockResolvedValue({ tier: 'PREMIUM', subscription: null })
      mockDealFindFirst.mockResolvedValue(null)
      await getInvestorDeal('d1', 'u-specific')
      const where = mockDealFindFirst.mock.calls[0][0].where
      expect(where.AND[1].application.investorProfile.userId).toBe('u-specific')
    })

    it('forwards the include option to prisma.deal.findFirst', async () => {
      mockUserFindUnique.mockResolvedValue({ tier: 'PREMIUM', subscription: null })
      mockDealFindFirst.mockResolvedValue({ id: 'd1', offer: null })
      await getInvestorDeal('d1', 'u1', { include: { offer: true } })
      expect(mockDealFindFirst.mock.calls[0][0].include).toEqual({ offer: true })
    })
  })

  describe('getAdminDeal', () => {
    it('uses findUnique with no tier filter', async () => {
      mockDealFindUnique.mockResolvedValue({ id: 'd1' })
      await getAdminDeal('d1')
      expect(mockDealFindUnique).toHaveBeenCalledWith({ where: { id: 'd1' } })
      expect(mockDealFindFirst).not.toHaveBeenCalled()
    })

    it('forwards the include option', async () => {
      mockDealFindUnique.mockResolvedValue({ id: 'd1', offer: null })
      await getAdminDeal('d1', { include: { offer: true } })
      expect(mockDealFindUnique).toHaveBeenCalledWith({ where: { id: 'd1' }, include: { offer: true } })
    })
  })

  describe('getDealForViewer', () => {
    it('uses admin path when role is admin', async () => {
      mockDealFindUnique.mockResolvedValue({ id: 'd1' })
      await getDealForViewer('d1', 'u1', 'admin')
      expect(mockDealFindUnique).toHaveBeenCalled()
      expect(mockUserFindUnique).not.toHaveBeenCalled()
    })

    it('uses investor path (tier-gated) when role is investor', async () => {
      mockUserFindUnique.mockResolvedValue({ tier: 'PREMIUM', subscription: null })
      mockDealFindFirst.mockResolvedValue({ id: 'd1' })
      await getDealForViewer('d1', 'u1', 'investor')
      expect(mockUserFindUnique).toHaveBeenCalled()
      expect(mockDealFindFirst).toHaveBeenCalled()
    })
  })
})
