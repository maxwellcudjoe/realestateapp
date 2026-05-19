import { describe, it, expect } from 'vitest'
import {
  signImpersonateCookie,
  verifyImpersonateCookie,
  isBlockedDuringImpersonation,
  maybeRefreshImpersonateCookie,
  IMPERSONATE_TTL_MS,
  IMPERSONATE_REFRESH_MS,
  IMPERSONATE_MAX_SESSION_MS,
} from '@/lib/impersonate'

const SECRET = 'test-secret-32-chars-or-more-padding-for-hmac'

describe('signImpersonateCookie / verifyImpersonateCookie', () => {
  it('roundtrips: a freshly signed cookie verifies', async () => {
    const { value } = await signImpersonateCookie(SECRET, 'admin1', 'investor1')
    const out = await verifyImpersonateCookie(SECRET, value)
    expect(out).not.toBeNull()
    expect(out?.adminId).toBe('admin1')
    expect(out?.targetUserId).toBe('investor1')
  })

  it('returns null when cookie is undefined or empty', async () => {
    expect(await verifyImpersonateCookie(SECRET, undefined)).toBeNull()
    expect(await verifyImpersonateCookie(SECRET, '')).toBeNull()
  })

  it('returns null when cookie is malformed', async () => {
    expect(await verifyImpersonateCookie(SECRET, 'noseparator')).toBeNull()
    expect(await verifyImpersonateCookie(SECRET, 'bad.payload')).toBeNull()
  })

  it('returns null when signature does not match secret', async () => {
    const { value } = await signImpersonateCookie(SECRET, 'admin1', 'investor1')
    expect(await verifyImpersonateCookie('different-secret-but-same-length-32+', value)).toBeNull()
  })

  it('returns null when payload tampering breaks signature', async () => {
    const { value } = await signImpersonateCookie(SECRET, 'admin1', 'investor1')
    const [, sig] = value.split('.')
    const fakePayload = Buffer.from(JSON.stringify({
      adminId: 'admin1', targetUserId: 'attacker', issuedAt: Date.now(), expiresAt: Date.now() + 60_000,
    })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(await verifyImpersonateCookie(SECRET, `${fakePayload}.${sig}`)).toBeNull()
  })

  it('returns null when cookie has expired', async () => {
    const long_ago = new Date(Date.now() - IMPERSONATE_TTL_MS - 60_000)
    const { value } = await signImpersonateCookie(SECRET, 'admin1', 'investor1', long_ago)
    expect(await verifyImpersonateCookie(SECRET, value)).toBeNull()
  })

  it('payload contains adminId, targetUserId, issuedAt, expiresAt', async () => {
    const before = Date.now()
    const { payload } = await signImpersonateCookie(SECRET, 'admin1', 'investor1')
    expect(payload.adminId).toBe('admin1')
    expect(payload.targetUserId).toBe('investor1')
    expect(payload.issuedAt).toBeGreaterThanOrEqual(before)
    expect(payload.expiresAt).toBeGreaterThan(payload.issuedAt)
    expect(payload.expiresAt - payload.issuedAt).toBe(IMPERSONATE_TTL_MS)
  })

  it('defaults to read mode', async () => {
    const { payload } = await signImpersonateCookie(SECRET, 'admin1', 'investor1')
    expect(payload.mode).toBe('read')
    expect(payload.reason).toBeUndefined()
  })

  it('round-trips write mode + reason', async () => {
    const { value } = await signImpersonateCookie(SECRET, 'admin1', 'investor1', new Date(), 'write', 'investor asked to upload on the phone')
    const verified = await verifyImpersonateCookie(SECRET, value)
    expect(verified?.mode).toBe('write')
    expect(verified?.reason).toBe('investor asked to upload on the phone')
  })
})

describe('maybeRefreshImpersonateCookie', () => {
  const issuedAt = new Date('2026-05-19T12:00:00Z').getTime()

  it('does NOT refresh when plenty of TTL remains', async () => {
    const payload = {
      adminId: 'admin1',
      targetUserId: 'investor1',
      issuedAt,
      expiresAt: issuedAt + IMPERSONATE_TTL_MS,
    }
    const out = await maybeRefreshImpersonateCookie(SECRET, payload, new Date(issuedAt + 60_000))
    expect(out).toBeNull()
  })

  it('refreshes when remaining TTL is below the threshold', async () => {
    const payload = {
      adminId: 'admin1',
      targetUserId: 'investor1',
      issuedAt,
      expiresAt: issuedAt + IMPERSONATE_TTL_MS,
    }
    const justBeforeExpiry = new Date(payload.expiresAt - IMPERSONATE_REFRESH_MS / 2)
    const out = await maybeRefreshImpersonateCookie(SECRET, payload, justBeforeExpiry)
    expect(out).not.toBeNull()
    // Refresh preserves issuedAt and bumps expiresAt by another full TTL
    expect(out!.payload.issuedAt).toBe(issuedAt)
    expect(out!.payload.expiresAt).toBe(justBeforeExpiry.getTime() + IMPERSONATE_TTL_MS)
    // Resulting cookie verifies cleanly
    const verified = await verifyImpersonateCookie(SECRET, out!.value, justBeforeExpiry)
    expect(verified?.targetUserId).toBe('investor1')
  })

  it('does NOT refresh once max session age is reached', async () => {
    const payload = {
      adminId: 'admin1',
      targetUserId: 'investor1',
      issuedAt,
      // Pretend the latest refresh pushed expiry past the absolute cap
      expiresAt: issuedAt + IMPERSONATE_MAX_SESSION_MS + 60_000,
    }
    const farFuture = new Date(issuedAt + IMPERSONATE_MAX_SESSION_MS + 30_000)
    const out = await maybeRefreshImpersonateCookie(SECRET, payload, farFuture)
    expect(out).toBeNull()
  })

  it('refreshed cookie cannot extend a session indefinitely', async () => {
    // Simulate ~4 hours of activity by chaining refreshes
    const start = new Date('2026-05-19T12:00:00Z')
    let { payload } = await signImpersonateCookie(SECRET, 'admin1', 'investor1', start)
    let now = start.getTime()
    let refreshes = 0
    while (refreshes < 50) {
      // Move clock 25 minutes forward (just before TTL boundary, triggers refresh)
      now += 25 * 60 * 1000
      const result = await maybeRefreshImpersonateCookie(SECRET, payload, new Date(now))
      if (!result) break
      payload = result.payload
      refreshes++
    }
    expect(refreshes).toBeGreaterThan(0)
    // 4-hour cap should be hit before unbounded refresh
    expect(now - payload.issuedAt).toBeGreaterThanOrEqual(IMPERSONATE_MAX_SESSION_MS)
  })
})

describe('isBlockedDuringImpersonation', () => {
  it('allows GET on any path', () => {
    expect(isBlockedDuringImpersonation('GET', '/api/portal/deals')).toBe(false)
    expect(isBlockedDuringImpersonation('GET', '/api/admin/investors')).toBe(false)
  })

  it('blocks POST / PATCH / PUT / DELETE on /api/* (default read-mode)', () => {
    expect(isBlockedDuringImpersonation('POST', '/api/portal/messages')).toBe(true)
    expect(isBlockedDuringImpersonation('PATCH', '/api/admin/applications/x/profile')).toBe(true)
    expect(isBlockedDuringImpersonation('PUT', '/api/portal/x')).toBe(true)
    expect(isBlockedDuringImpersonation('DELETE', '/api/admin/something')).toBe(true)
  })

  it('does NOT block non-/api paths (page navigation is fine)', () => {
    expect(isBlockedDuringImpersonation('POST', '/portal/profile')).toBe(false)
  })

  it('always allows the impersonate stop endpoint', () => {
    expect(isBlockedDuringImpersonation('DELETE', '/api/admin/users/u1/impersonate')).toBe(false)
    expect(isBlockedDuringImpersonation('POST', '/api/admin/users/u1/impersonate')).toBe(false)
  })

  it('case-insensitive on method', () => {
    expect(isBlockedDuringImpersonation('post', '/api/x')).toBe(true)
  })

  it('write-mode does NOT block any mutation', () => {
    expect(isBlockedDuringImpersonation('POST', '/api/portal/messages', 'write')).toBe(false)
    expect(isBlockedDuringImpersonation('PATCH', '/api/admin/applications/x/profile', 'write')).toBe(false)
    expect(isBlockedDuringImpersonation('DELETE', '/api/admin/something', 'write')).toBe(false)
  })
})
