import { describe, it, expect } from 'vitest'
import {
  filterInvestors,
  isKycExpiringSoon,
  DEFAULT_FILTERS,
  type InvestorRow,
  type InvestorFilters,
} from '@/lib/investor-filter'

const NOW = new Date('2026-05-19T00:00:00Z').getTime()

function row(overrides: Partial<InvestorRow> = {}): InvestorRow {
  return {
    name: 'Jane Smith',
    email: 'jane@example.com',
    status: 'SUBMITTED',
    tier: 'FREE',
    isPep: false,
    entityType: 'INDIVIDUAL',
    complianceCompleted: true,
    kycExpiresAt: null,
    deletedAt: null,
    ...overrides,
  }
}

function withFilters(overrides: Partial<InvestorFilters>): InvestorFilters {
  return { ...DEFAULT_FILTERS, ...overrides }
}

describe('filterInvestors', () => {
  it('returns all rows under default filters', () => {
    const rows = [row(), row({ name: 'Bob' }), row({ name: 'Eve' })]
    expect(filterInvestors(rows, DEFAULT_FILTERS, NOW)).toHaveLength(3)
  })

  it('hides soft-deleted rows by default', () => {
    const rows = [row({ name: 'Alive' }), row({ name: 'Gone', deletedAt: '2026-04-01T00:00:00Z' })]
    const out = filterInvestors(rows, DEFAULT_FILTERS, NOW)
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Alive')
  })

  it('shows soft-deleted when showDeleted=true', () => {
    const rows = [row({ name: 'Alive' }), row({ name: 'Gone', deletedAt: '2026-04-01T00:00:00Z' })]
    const out = filterInvestors(rows, withFilters({ showDeleted: true }), NOW)
    expect(out).toHaveLength(2)
  })

  it('filters by status', () => {
    const rows = [
      row({ status: 'SUBMITTED' }),
      row({ status: 'KYC_APPROVED', name: 'Bob' }),
    ]
    const out = filterInvestors(rows, withFilters({ status: 'KYC_APPROVED' }), NOW)
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Bob')
  })

  it('filters by tier', () => {
    const rows = [row({ tier: 'FREE' }), row({ tier: 'PREMIUM', name: 'Premium Pete' })]
    const out = filterInvestors(rows, withFilters({ tier: 'PREMIUM' }), NOW)
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Premium Pete')
  })

  it('filters by PEP=YES', () => {
    const rows = [row({ isPep: false }), row({ isPep: true, name: 'PEP Pat' })]
    const out = filterInvestors(rows, withFilters({ pep: 'YES' }), NOW)
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('PEP Pat')
  })

  it('filters by PEP=NO', () => {
    const rows = [row({ isPep: false }), row({ isPep: true, name: 'PEP Pat' })]
    const out = filterInvestors(rows, withFilters({ pep: 'NO' }), NOW)
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Jane Smith')
  })

  it('filters by compliance=INCOMPLETE (legacy accounts)', () => {
    const rows = [row({ complianceCompleted: true }), row({ complianceCompleted: false, name: 'Legacy Lou' })]
    const out = filterInvestors(rows, withFilters({ compliance: 'INCOMPLETE' }), NOW)
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Legacy Lou')
  })

  it('filters by kycExpiring=YES (within 30d or expired)', () => {
    const in10d = new Date(NOW + 10 * 24 * 60 * 60 * 1000).toISOString()
    const in60d = new Date(NOW + 60 * 24 * 60 * 60 * 1000).toISOString()
    const expired = new Date(NOW - 24 * 60 * 60 * 1000).toISOString()
    const rows = [
      row({ kycExpiresAt: in10d, name: 'Soon' }),
      row({ kycExpiresAt: in60d, name: 'Later' }),
      row({ kycExpiresAt: expired, name: 'Past' }),
      row({ kycExpiresAt: null, name: 'None' }),
    ]
    const out = filterInvestors(rows, withFilters({ kycExpiring: 'YES' }), NOW)
    const names = out.map((r) => r.name).sort()
    expect(names).toEqual(['Past', 'Soon'])
  })

  it('filters by entityType', () => {
    const rows = [row({ entityType: 'INDIVIDUAL' }), row({ entityType: 'LTD_COMPANY', name: 'Ltd Co' })]
    const out = filterInvestors(rows, withFilters({ entityType: 'LTD_COMPANY' }), NOW)
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Ltd Co')
  })

  it('search matches name and email case-insensitively', () => {
    const rows = [
      row({ name: 'Alice Anderson', email: 'a@x.com' }),
      row({ name: 'Bob', email: 'bob@example.com' }),
    ]
    expect(filterInvestors(rows, withFilters({ search: 'alice' }), NOW)).toHaveLength(1)
    expect(filterInvestors(rows, withFilters({ search: 'EXAMPLE.COM' }), NOW)).toHaveLength(1)
    expect(filterInvestors(rows, withFilters({ search: 'nomatch' }), NOW)).toHaveLength(0)
  })

  it('composes multiple filters (AND)', () => {
    const in10d = new Date(NOW + 10 * 24 * 60 * 60 * 1000).toISOString()
    const rows = [
      row({ tier: 'PREMIUM', isPep: true, kycExpiresAt: in10d, name: 'Hot Lead' }),
      row({ tier: 'PREMIUM', isPep: false, name: 'Other Premium' }),
      row({ tier: 'FREE', isPep: true, name: 'Free PEP' }),
    ]
    const out = filterInvestors(
      rows,
      withFilters({ tier: 'PREMIUM', pep: 'YES', kycExpiring: 'YES' }),
      NOW,
    )
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Hot Lead')
  })
})

describe('isKycExpiringSoon', () => {
  it('returns false when null', () => {
    expect(isKycExpiringSoon(null, NOW)).toBe(false)
  })

  it('returns false when expiry is more than 30 days away', () => {
    const in60d = new Date(NOW + 60 * 24 * 60 * 60 * 1000).toISOString()
    expect(isKycExpiringSoon(in60d, NOW)).toBe(false)
  })

  it('returns true when expiry is within 30 days', () => {
    const in10d = new Date(NOW + 10 * 24 * 60 * 60 * 1000).toISOString()
    expect(isKycExpiringSoon(in10d, NOW)).toBe(true)
  })

  it('returns true when already expired', () => {
    const expired = new Date(NOW - 24 * 60 * 60 * 1000).toISOString()
    expect(isKycExpiringSoon(expired, NOW)).toBe(true)
  })
})
