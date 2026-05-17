import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  checkPasswordComplexity,
  passwordStrength,
  checkPasswordBreached,
} from '@/lib/password'

const originalFetch = global.fetch

describe('checkPasswordComplexity', () => {
  it('flags every missing rule', () => {
    const r = checkPasswordComplexity('abc')
    expect(r.ok).toBe(false)
    expect(r.errors.length).toBeGreaterThanOrEqual(4)
  })

  it('accepts a strong password', () => {
    const r = checkPasswordComplexity('Abcd1234!')
    expect(r.ok).toBe(true)
    expect(r.errors).toEqual([])
  })

  it('requires a symbol', () => {
    const r = checkPasswordComplexity('Abcd1234')
    expect(r.ok).toBe(false)
    expect(r.errors.join(' ')).toContain('symbol')
  })
})

describe('passwordStrength', () => {
  it('returns 0 for empty', () => {
    expect(passwordStrength('')).toBe(0)
  })
  it('returns higher score for longer + mixed', () => {
    expect(passwordStrength('abcd1234')).toBeLessThan(passwordStrength('Abcd1234!Long'))
  })
  it('caps at 4', () => {
    expect(passwordStrength('Aaaaaa1!XXXXXXXXXX')).toBeLessThanOrEqual(4)
  })
})

describe('checkPasswordBreached', () => {
  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('returns pwned=true when HIBP suffix matches', async () => {
    // SHA1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    // Prefix 5BAA6, suffix 1E4C9B93F3F0682250B6CF8331B7EE68FD8
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '1E4C9B93F3F0682250B6CF8331B7EE68FD8:12345\nDEADBEEF:1',
    }) as any
    const r = await checkPasswordBreached('password')
    expect(r.pwned).toBe(true)
    expect(r.count).toBe(12345)
  })

  it('returns pwned=false when suffix not in response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'AAAAAAA:1\nBBBBBBB:2',
    }) as any
    const r = await checkPasswordBreached('UniquePassword!2026')
    expect(r.pwned).toBe(false)
  })

  it('returns pwned=false on network error (fail-safe)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as any
    const r = await checkPasswordBreached('whatever')
    expect(r.pwned).toBe(false)
  })
})
