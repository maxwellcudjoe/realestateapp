import { describe, it, expect } from 'vitest'
import { formatTrustNumber, formatTrustGbp } from '@/lib/homepage-metrics'

describe('formatTrustNumber', () => {
  it('returns exact value under 10', () => {
    expect(formatTrustNumber(0)).toBe('0')
    expect(formatTrustNumber(7)).toBe('7')
  })

  it('rounds down to nearest 10 in the 10–99 range', () => {
    expect(formatTrustNumber(47)).toBe('40+')
    expect(formatTrustNumber(99)).toBe('90+')
  })

  it('rounds down to nearest 50 in the 100–999 range', () => {
    expect(formatTrustNumber(247)).toBe('200+')
    expect(formatTrustNumber(150)).toBe('150+')
  })

  it('rounds down to nearest 100 in the 1000–9999 range', () => {
    expect(formatTrustNumber(1247)).toBe('1200+')
    expect(formatTrustNumber(1050)).toBe('1000+')
  })

  it('uses k+ above 10000', () => {
    expect(formatTrustNumber(12345)).toBe('12k+')
    expect(formatTrustNumber(99999)).toBe('99k+')
  })

  it('uses M+ above a million', () => {
    expect(formatTrustNumber(1_500_000)).toBe('1M+')
    expect(formatTrustNumber(25_000_000)).toBe('25M+')
  })
})

describe('formatTrustGbp', () => {
  it('keeps small numbers exact', () => {
    expect(formatTrustGbp(500)).toBe('£500')
  })

  it('uses k+ at thousand scale', () => {
    expect(formatTrustGbp(45_000)).toBe('£45k+')
  })

  it('uses M+ with 1 decimal under £10M', () => {
    expect(formatTrustGbp(2_500_000)).toBe('£2.5M+')
    expect(formatTrustGbp(8_200_000)).toBe('£8.2M+')
  })

  it('uses M+ no decimal above £10M', () => {
    expect(formatTrustGbp(45_000_000)).toBe('£45M+')
  })

  it('uses B+ at billion scale', () => {
    expect(formatTrustGbp(2_500_000_000)).toBe('£2.5B+')
  })
})
