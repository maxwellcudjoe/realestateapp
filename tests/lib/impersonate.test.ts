import { describe, it, expect } from 'vitest'
import {
  signImpersonateCookie,
  verifyImpersonateCookie,
  isBlockedDuringImpersonation,
  IMPERSONATE_TTL_MS,
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
})

describe('isBlockedDuringImpersonation', () => {
  it('allows GET on any path', () => {
    expect(isBlockedDuringImpersonation('GET', '/api/portal/deals')).toBe(false)
    expect(isBlockedDuringImpersonation('GET', '/api/admin/investors')).toBe(false)
  })

  it('blocks POST / PATCH / PUT / DELETE on /api/*', () => {
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
})
