import { describe, it, expect, afterEach } from 'vitest'
import {
  premiumMonthlyAmount,
  premiumAnnualAmount,
  defaultAmountFor,
  nextRenewalDate,
  freeTierDealCutoff,
  effectiveTier,
  PREMIUM_PREVIEW_HOURS,
  BILLING_PERIODS,
  USER_TIERS,
} from '@/lib/subscriptions'

afterEach(() => {
  delete process.env.REVE_BATIR_PREMIUM_MONTHLY
  delete process.env.REVE_BATIR_PREMIUM_ANNUAL
})

describe('subscriptions lib', () => {
  describe('constants', () => {
    it('exports two billing periods', () => {
      expect(BILLING_PERIODS).toEqual(['MONTHLY', 'ANNUAL'])
    })
    it('exports two tiers', () => {
      expect(USER_TIERS).toEqual(['FREE', 'PREMIUM'])
    })
    it('PREMIUM_PREVIEW_HOURS is 48', () => {
      expect(PREMIUM_PREVIEW_HOURS).toBe(48)
    })
  })

  describe('premiumMonthlyAmount', () => {
    it('defaults to 49', () => expect(premiumMonthlyAmount()).toBe(49))
    it('reads env override', () => {
      process.env.REVE_BATIR_PREMIUM_MONTHLY = '79'
      expect(premiumMonthlyAmount()).toBe(79)
    })
    it('falls back on garbage env', () => {
      process.env.REVE_BATIR_PREMIUM_MONTHLY = 'oops'
      expect(premiumMonthlyAmount()).toBe(49)
    })
  })

  describe('premiumAnnualAmount', () => {
    it('defaults to 499', () => expect(premiumAnnualAmount()).toBe(499))
    it('reads env override', () => {
      process.env.REVE_BATIR_PREMIUM_ANNUAL = '799'
      expect(premiumAnnualAmount()).toBe(799)
    })
  })

  describe('defaultAmountFor', () => {
    it('returns annual amount for ANNUAL', () => expect(defaultAmountFor('ANNUAL')).toBe(499))
    it('returns monthly amount for MONTHLY', () => expect(defaultAmountFor('MONTHLY')).toBe(49))
  })

  describe('nextRenewalDate', () => {
    it('adds 1 month for MONTHLY', () => {
      const result = nextRenewalDate(new Date('2026-05-17T12:00:00Z'), 'MONTHLY')
      expect(result.toISOString()).toBe('2026-06-17T12:00:00.000Z')
    })
    it('adds 1 year for ANNUAL', () => {
      const result = nextRenewalDate(new Date('2026-05-17T12:00:00Z'), 'ANNUAL')
      expect(result.toISOString()).toBe('2027-05-17T12:00:00.000Z')
    })
  })

  describe('freeTierDealCutoff', () => {
    it('returns now minus 48 hours', () => {
      const now = new Date('2026-05-17T12:00:00Z')
      const cutoff = freeTierDealCutoff(now)
      expect(cutoff.toISOString()).toBe('2026-05-15T12:00:00.000Z')
    })
  })

  describe('effectiveTier', () => {
    const now = new Date('2026-05-19T12:00:00Z')

    it('returns FREE for a stored FREE user with no subscription', () => {
      expect(effectiveTier({ tier: 'FREE', subscription: null }, now)).toBe('FREE')
    })

    it('returns FREE when tier is null/undefined', () => {
      expect(effectiveTier({}, now)).toBe('FREE')
    })

    it('returns PREMIUM for a PREMIUM user with active subscription', () => {
      expect(effectiveTier({
        tier: 'PREMIUM',
        subscription: { cancelledAt: null, nextRenewalAt: new Date('2026-06-19T12:00:00Z') },
      }, now)).toBe('PREMIUM')
    })

    it('returns PREMIUM for a cancelled-but-not-yet-expired subscription (C7 fix)', () => {
      expect(effectiveTier({
        tier: 'PREMIUM',
        subscription: { cancelledAt: new Date('2026-05-15T00:00:00Z'), nextRenewalAt: new Date('2026-06-01T12:00:00Z') },
      }, now)).toBe('PREMIUM')
    })

    it('returns FREE for a cancelled subscription past its renewal date', () => {
      expect(effectiveTier({
        tier: 'PREMIUM',
        subscription: { cancelledAt: new Date('2026-04-15T00:00:00Z'), nextRenewalAt: new Date('2026-05-01T12:00:00Z') },
      }, now)).toBe('FREE')
    })

    it('returns PREMIUM for an uncancelled subscription even if renewal is overdue (admin needs to bill them)', () => {
      expect(effectiveTier({
        tier: 'PREMIUM',
        subscription: { cancelledAt: null, nextRenewalAt: new Date('2026-04-15T12:00:00Z') },
      }, now)).toBe('PREMIUM')
    })
  })
})
