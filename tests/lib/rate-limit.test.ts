import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, _resetRateLimits, getClientIp } from '@/lib/rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => _resetRateLimits())

  it('allows requests under the limit', () => {
    const opts = { key: 'a', limit: 3, windowMs: 1000 }
    expect(checkRateLimit(opts).ok).toBe(true)
    expect(checkRateLimit(opts).ok).toBe(true)
    expect(checkRateLimit(opts).ok).toBe(true)
  })

  it('blocks requests over the limit', () => {
    const opts = { key: 'b', limit: 2, windowMs: 1000 }
    expect(checkRateLimit(opts).ok).toBe(true)
    expect(checkRateLimit(opts).ok).toBe(true)
    const blocked = checkRateLimit(opts)
    expect(blocked.ok).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('isolates buckets by key', () => {
    const a = { key: 'a', limit: 1, windowMs: 1000 }
    const b = { key: 'b', limit: 1, windowMs: 1000 }
    expect(checkRateLimit(a).ok).toBe(true)
    expect(checkRateLimit(a).ok).toBe(false)
    expect(checkRateLimit(b).ok).toBe(true) // separate bucket
  })

  it('resets after window expires', async () => {
    const opts = { key: 'c', limit: 1, windowMs: 50 }
    expect(checkRateLimit(opts).ok).toBe(true)
    expect(checkRateLimit(opts).ok).toBe(false)
    await new Promise((r) => setTimeout(r, 75))
    expect(checkRateLimit(opts).ok).toBe(true)
  })
})

describe('getClientIp', () => {
  it('returns first IP from x-forwarded-for chain', () => {
    const req = new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip when no XFF', () => {
    const req = new Request('http://x', { headers: { 'x-real-ip': '9.9.9.9' } })
    expect(getClientIp(req)).toBe('9.9.9.9')
  })

  it('returns "unknown" when no proxy headers', () => {
    const req = new Request('http://x')
    expect(getClientIp(req)).toBe('unknown')
  })
})
