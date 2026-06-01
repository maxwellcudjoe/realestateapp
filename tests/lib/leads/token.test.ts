import { describe, it, expect } from 'vitest'
import { generateToken, isTokenValid, TOKEN_TTL_MS } from '@/lib/leads/token'

describe('generateToken', () => {
  it('returns a url-safe string ≥ 43 chars (32 bytes base64url)', () => {
    const t = generateToken()
    expect(t).toMatch(/^[A-Za-z0-9_-]{43,}$/)
  })
  it('returns unique tokens across calls (entropy sanity)', () => {
    const set = new Set(Array.from({ length: 100 }, () => generateToken()))
    expect(set.size).toBe(100)
  })
})

describe('TOKEN_TTL_MS', () => {
  it('is 24 hours', () => {
    expect(TOKEN_TTL_MS).toBe(24 * 60 * 60 * 1000)
  })
})

describe('isTokenValid', () => {
  const now = new Date('2026-06-01T12:00:00Z')

  it('true when not used and not expired', () => {
    const row = { usedAt: null, expiresAt: new Date('2026-06-02T12:00:00Z') }
    expect(isTokenValid(row, now)).toBe(true)
  })
  it('false when already used', () => {
    const row = { usedAt: new Date('2026-06-01T13:00:00Z'), expiresAt: new Date('2026-06-02T12:00:00Z') }
    expect(isTokenValid(row, now)).toBe(false)
  })
  it('false when expired (expiresAt < now)', () => {
    const row = { usedAt: null, expiresAt: new Date('2026-05-31T12:00:00Z') }
    expect(isTokenValid(row, now)).toBe(false)
  })
  it('false when expiresAt equals now (strict greater-than)', () => {
    const row = { usedAt: null, expiresAt: now }
    expect(isTokenValid(row, now)).toBe(false)
  })
})
