import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const originalEnv = { ...process.env }

describe('sumsubConfigured', () => {
  afterEach(() => { process.env = { ...originalEnv } })

  it('returns false when token or secret missing', async () => {
    delete process.env.SUMSUB_APP_TOKEN
    delete process.env.SUMSUB_SECRET_KEY
    const { sumsubConfigured } = await import('@/lib/sumsub')
    expect(sumsubConfigured()).toBe(false)
  })

  it('returns true when both env vars present', async () => {
    process.env.SUMSUB_APP_TOKEN = 'sbx:abc.def'
    process.env.SUMSUB_SECRET_KEY = 'secret123'
    const { sumsubConfigured } = await import('@/lib/sumsub')
    expect(sumsubConfigured()).toBe(true)
  })
})

describe('mapSumSubStatus', () => {
  it('returns PENDING for non-completed reviews', async () => {
    const { mapSumSubStatus } = await import('@/lib/sumsub')
    expect(mapSumSubStatus({ reviewStatus: 'pending' })).toBe('PENDING')
    expect(mapSumSubStatus({ reviewStatus: 'queued' })).toBe('PENDING')
    expect(mapSumSubStatus({ reviewStatus: 'init' })).toBe('PENDING')
  })

  it('returns CLEAR for completed + GREEN', async () => {
    const { mapSumSubStatus } = await import('@/lib/sumsub')
    expect(mapSumSubStatus({ reviewStatus: 'completed', reviewResult: { reviewAnswer: 'GREEN' } })).toBe('CLEAR')
  })

  it('returns REJECTED for completed + RED', async () => {
    const { mapSumSubStatus } = await import('@/lib/sumsub')
    expect(mapSumSubStatus({ reviewStatus: 'completed', reviewResult: { reviewAnswer: 'RED' } })).toBe('REJECTED')
  })

  it('returns CONSIDER for completed + YELLOW or missing answer', async () => {
    const { mapSumSubStatus } = await import('@/lib/sumsub')
    expect(mapSumSubStatus({ reviewStatus: 'completed', reviewResult: { reviewAnswer: 'YELLOW' } })).toBe('CONSIDER')
    expect(mapSumSubStatus({ reviewStatus: 'completed' })).toBe('CONSIDER')
  })
})

describe('verifyWebhookSignature', () => {
  beforeEach(() => { process.env.SUMSUB_WEBHOOK_SECRET = 'shared-secret' })
  afterEach(() => { process.env = { ...originalEnv } })

  it('returns false when secret unset', async () => {
    delete process.env.SUMSUB_WEBHOOK_SECRET
    const { verifyWebhookSignature } = await import('@/lib/sumsub')
    expect(verifyWebhookSignature('body', 'sig')).toBe(false)
  })

  it('verifies a correct HMAC-SHA256 signature', async () => {
    const crypto = await import('crypto')
    const body = '{"applicantId":"abc"}'
    const expected = crypto.createHmac('sha256', 'shared-secret').update(body).digest('hex')
    const { verifyWebhookSignature } = await import('@/lib/sumsub')
    expect(verifyWebhookSignature(body, expected)).toBe(true)
  })

  it('rejects a tampered signature', async () => {
    const { verifyWebhookSignature } = await import('@/lib/sumsub')
    expect(verifyWebhookSignature('{"applicantId":"abc"}', 'a'.repeat(64))).toBe(false)
  })
})
