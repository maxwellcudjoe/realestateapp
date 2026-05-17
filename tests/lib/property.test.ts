import { describe, it, expect } from 'vitest'
import { computeGrossYield, propertyTypeLabel, tenureLabel, epcRatingColor, VALID_EPC_RATINGS } from '@/lib/property'

describe('computeGrossYield', () => {
  it('returns null when monthly rent missing', () => {
    expect(computeGrossYield(null, 250_000)).toBeNull()
  })
  it('returns null when price missing or zero', () => {
    expect(computeGrossYield(1000, null)).toBeNull()
    expect(computeGrossYield(1000, 0)).toBeNull()
  })
  it('computes gross yield correctly', () => {
    expect(computeGrossYield(1000, 200_000)).toBeCloseTo(6) // 12000/200000 = 0.06 = 6%
    expect(computeGrossYield(1500, 250_000)).toBeCloseTo(7.2)
  })
})

describe('labels + colour ramp', () => {
  it('propertyTypeLabel handles known + unknown', () => {
    expect(propertyTypeLabel('TERRACED')).toBe('Terraced')
    expect(propertyTypeLabel(null)).toBe('—')
    expect(propertyTypeLabel('UNKNOWN')).toBe('UNKNOWN')
  })
  it('tenureLabel handles known', () => {
    expect(tenureLabel('FREEHOLD')).toBe('Freehold')
    expect(tenureLabel('LEASEHOLD')).toBe('Leasehold')
  })
  it('epcRatingColor returns green for A/B, red for F/G', () => {
    expect(epcRatingColor('A')).toContain('green')
    expect(epcRatingColor('B')).toContain('green')
    expect(epcRatingColor('F')).toContain('red')
    expect(epcRatingColor('G')).toContain('red')
    expect(epcRatingColor(null)).toContain('stone')
  })
  it('VALID_EPC_RATINGS contains the full A–G ladder', () => {
    for (const r of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
      expect(VALID_EPC_RATINGS.has(r)).toBe(true)
    }
  })
})
