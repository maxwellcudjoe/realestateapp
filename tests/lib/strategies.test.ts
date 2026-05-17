import { describe, it, expect } from 'vitest'
import { STRATEGIES, VALID_STRATEGY_CODES, strategyLabel, legacyToStrategies } from '@/lib/strategies'

describe('strategies catalog', () => {
  it('exposes 5 strategies', () => {
    expect(STRATEGIES).toHaveLength(5)
  })
  it('VALID_STRATEGY_CODES covers everything', () => {
    for (const s of STRATEGIES) expect(VALID_STRATEGY_CODES.has(s.code)).toBe(true)
  })
  it('strategyLabel returns the label', () => {
    expect(strategyLabel('BTL')).toMatch(/Buy To Let/)
    expect(strategyLabel('unknown')).toBe('unknown')
  })
})

describe('legacyToStrategies', () => {
  it('maps single legacy values', () => {
    expect(legacyToStrategies('BTL')).toEqual(['BTL'])
    expect(legacyToStrategies('HMO')).toEqual(['HMO'])
    expect(legacyToStrategies('Flip')).toEqual(['FLIP'])
  })
  it('expands Any/All to every strategy', () => {
    expect(legacyToStrategies('Any')).toEqual(STRATEGIES.map((s) => s.code))
    expect(legacyToStrategies('All')).toEqual(STRATEGIES.map((s) => s.code))
  })
  it('handles SA shorthand for serviced accommodation', () => {
    expect(legacyToStrategies('SA')).toEqual(['SERVICED_ACCOM'])
  })
  it('returns empty for null/empty', () => {
    expect(legacyToStrategies(null)).toEqual([])
    expect(legacyToStrategies('')).toEqual([])
    expect(legacyToStrategies('mystery-value')).toEqual([])
  })
})
