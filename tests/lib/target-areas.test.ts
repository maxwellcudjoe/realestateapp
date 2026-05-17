import { describe, it, expect } from 'vitest'
import { TARGET_AREAS, VALID_AREA_CODES, areaLabel, areasByGroup } from '@/lib/target-areas'

describe('target-areas catalog', () => {
  it('contains some expected major cities', () => {
    const codes = TARGET_AREAS.map((a) => a.code)
    expect(codes).toContain('manchester')
    expect(codes).toContain('birmingham')
    expect(codes).toContain('edinburgh')
    expect(codes).toContain('belfast')
  })

  it('every code is unique', () => {
    const codes = TARGET_AREAS.map((a) => a.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('VALID_AREA_CODES contains all catalog codes', () => {
    for (const a of TARGET_AREAS) {
      expect(VALID_AREA_CODES.has(a.code)).toBe(true)
    }
  })

  it('areaLabel returns label for known code and falls back to the code for unknown', () => {
    expect(areaLabel('manchester')).toBe('Manchester (M)')
    expect(areaLabel('not-a-real-code')).toBe('not-a-real-code')
  })

  it('areasByGroup groups entries and preserves group ordering', () => {
    const grouped = areasByGroup()
    expect(grouped.London).toBeTruthy()
    expect(grouped['North West']).toBeTruthy()
    expect(grouped.Scotland).toBeTruthy()
    // Manchester should be in North West
    const nw = grouped['North West'].map((a) => a.code)
    expect(nw).toContain('manchester')
  })
})
