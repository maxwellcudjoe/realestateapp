import { describe, it, expect } from 'vitest'
import {
  pendingSubscriptionRequests,
  parseRequestTypeFromBody,
  elapsedSince,
  type RequestMessage,
  type AdminReplyMessage,
} from '@/lib/subscription-requests'

const NOW = new Date('2026-05-19T12:00:00Z')

function req(overrides: Partial<RequestMessage> = {}): RequestMessage {
  return {
    id: 'm1',
    applicationId: 'app1',
    senderUserId: 'u1',
    subject: '[Subscription request] Upgrade to Premium',
    body: 'Request type: Upgrade to Premium',
    createdAt: new Date('2026-05-15T09:00:00Z'),
    ...overrides,
  }
}

function reply(overrides: Partial<AdminReplyMessage> = {}): AdminReplyMessage {
  return {
    applicationId: 'app1',
    senderUserId: 'admin1',
    createdAt: new Date('2026-05-16T09:00:00Z'),
    ...overrides,
  }
}

describe('pendingSubscriptionRequests', () => {
  it('returns all requests when no admin replies exist', () => {
    const r1 = req({ id: 'r1' })
    const r2 = req({ id: 'r2', applicationId: 'app2' })
    expect(pendingSubscriptionRequests([r1, r2], [])).toHaveLength(2)
  })

  it('hides a request when an admin replied on the same app afterwards', () => {
    const r = req({ id: 'r1', applicationId: 'app1' })
    const adminReply = reply({ applicationId: 'app1', createdAt: new Date('2026-05-16T00:00:00Z') })
    expect(pendingSubscriptionRequests([r], [adminReply])).toHaveLength(0)
  })

  it('keeps a request when the admin reply was BEFORE the request', () => {
    const r = req({ id: 'r1', applicationId: 'app1', createdAt: new Date('2026-05-17T00:00:00Z') })
    const oldAdminReply = reply({ applicationId: 'app1', createdAt: new Date('2026-05-10T00:00:00Z') })
    expect(pendingSubscriptionRequests([r], [oldAdminReply])).toHaveLength(1)
  })

  it('ignores admin replies on a different application', () => {
    const r = req({ id: 'r1', applicationId: 'app1' })
    const otherAppReply = reply({ applicationId: 'appXYZ', createdAt: new Date('2026-05-18T00:00:00Z') })
    expect(pendingSubscriptionRequests([r], [otherAppReply])).toHaveLength(1)
  })

  it('sorts pending requests oldest first', () => {
    const r1 = req({ id: 'r1', applicationId: 'a1', createdAt: new Date('2026-05-17T00:00:00Z') })
    const r2 = req({ id: 'r2', applicationId: 'a2', createdAt: new Date('2026-05-15T00:00:00Z') })
    const r3 = req({ id: 'r3', applicationId: 'a3', createdAt: new Date('2026-05-18T00:00:00Z') })
    const out = pendingSubscriptionRequests([r1, r2, r3], [])
    expect(out.map((r) => r.id)).toEqual(['r2', 'r1', 'r3'])
  })
})

describe('parseRequestTypeFromBody', () => {
  it('extracts type from a well-formed body', () => {
    expect(parseRequestTypeFromBody('Request type: Upgrade to Premium\nCurrently: FREE'))
      .toBe('Upgrade to Premium')
  })

  it('returns null when no Request type line', () => {
    expect(parseRequestTypeFromBody('I want to cancel')).toBeNull()
  })

  it('trims trailing whitespace', () => {
    expect(parseRequestTypeFromBody('Request type:   Cancel subscription   ')).toBe('Cancel subscription')
  })
})

describe('elapsedSince', () => {
  it('returns "just now" under a minute', () => {
    expect(elapsedSince(new Date(NOW.getTime() - 30_000), NOW)).toBe('just now')
  })

  it('returns minutes', () => {
    expect(elapsedSince(new Date(NOW.getTime() - 5 * 60_000), NOW)).toBe('5m ago')
  })

  it('returns hours', () => {
    expect(elapsedSince(new Date(NOW.getTime() - 3 * 60 * 60_000), NOW)).toBe('3h ago')
  })

  it('returns "yesterday" at 1 day', () => {
    expect(elapsedSince(new Date(NOW.getTime() - 24 * 60 * 60_000), NOW)).toBe('yesterday')
  })

  it('returns days plural', () => {
    expect(elapsedSince(new Date(NOW.getTime() - 5 * 24 * 60 * 60_000), NOW)).toBe('5 days ago')
  })
})
