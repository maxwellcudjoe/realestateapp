import { describe, it, expect } from 'vitest'
import {
  getAllLandingPages,
  getLandingPage,
  isValidStrategySlug,
  isValidCitySlug,
  LANDING_PAGE_CITIES,
  LANDING_PAGE_STRATEGIES,
} from '@/lib/landing-pages'

describe('landing-pages catalog', () => {
  it('returns 24 combos (3 strategies × 8 cities)', () => {
    const pages = getAllLandingPages()
    expect(pages).toHaveLength(24)
    expect(LANDING_PAGE_STRATEGIES).toHaveLength(3)
    expect(LANDING_PAGE_CITIES).toHaveLength(8)
  })

  it('each entry has the expected shape and contentfulSlug format', () => {
    for (const p of getAllLandingPages()) {
      expect(p.contentfulSlug).toBe(`${p.strategySlug}-${p.citySlug}`)
      expect(['BTL', 'HMO', 'FLIP']).toContain(p.strategyCode)
      expect(p.cityLabel.length).toBeGreaterThan(0)
      expect(p.cityShort.length).toBeGreaterThan(0)
      expect(p.cityShort).not.toContain('(')
    }
  })

  it('getLandingPage returns a valid entry for known combos', () => {
    const page = getLandingPage('btl', 'manchester')
    expect(page).not.toBeNull()
    expect(page?.strategyCode).toBe('BTL')
    expect(page?.citySlug).toBe('manchester')
    expect(page?.cityShort).toBe('Manchester')
  })

  it('getLandingPage returns null for unknown strategy or city', () => {
    expect(getLandingPage('bogus', 'manchester')).toBeNull()
    expect(getLandingPage('btl', 'atlantis')).toBeNull()
    expect(getLandingPage('', '')).toBeNull()
  })

  it('isValidStrategySlug narrows correctly', () => {
    expect(isValidStrategySlug('btl')).toBe(true)
    expect(isValidStrategySlug('hmo')).toBe(true)
    expect(isValidStrategySlug('flip')).toBe(true)
    expect(isValidStrategySlug('commercial')).toBe(false)
    expect(isValidStrategySlug('BTL')).toBe(false) // case-sensitive on URL
  })

  it('isValidCitySlug accepts only the 8 catalog cities', () => {
    for (const c of LANDING_PAGE_CITIES) {
      expect(isValidCitySlug(c)).toBe(true)
    }
    expect(isValidCitySlug('london-central')).toBe(false)
    expect(isValidCitySlug('')).toBe(false)
  })
})
