import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { verifyTurnstile } from '@/lib/turnstile'

const originalEnv = process.env.TURNSTILE_SECRET_KEY
const originalFetch = global.fetch

describe('verifyTurnstile', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env.TURNSTILE_SECRET_KEY = originalEnv
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('returns ok=true with warning when secret is not configured', async () => {
    delete process.env.TURNSTILE_SECRET_KEY
    const result = await verifyTurnstile('any-token')
    expect(result.ok).toBe(true)
    expect(result.reason).toBe('not-configured')
  })

  it('returns ok=false when token is missing and secret is set', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    const result = await verifyTurnstile(undefined)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('missing-token')
  })

  it('returns ok=true when Cloudflare responds with success', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    }) as any
    const result = await verifyTurnstile('valid-token', '1.2.3.4')
    expect(result.ok).toBe(true)
  })

  it('returns ok=false with reason when Cloudflare rejects', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    }) as any
    const result = await verifyTurnstile('bad-token')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('invalid-input-response')
  })

  it('returns ok=false on network error', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret'
    global.fetch = vi.fn().mockRejectedValue(new Error('boom')) as any
    const result = await verifyTurnstile('token')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('network-error')
  })
})
