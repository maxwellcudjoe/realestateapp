import { describe, it, expect } from 'vitest'
import { isBlockedDomain, isBlockedLocalPart, BLOCKED_DOMAINS } from '@/lib/inbound/blocklist'

describe('inbound blocklist', () => {
  it('blocks facebook + linkedin + mailchimp + x + instagram', () => {
    for (const d of ['facebook.com', 'facebookmail.com', 'linkedin.com', 'mailchimp.com', 'mailchi.mp', 'twitter.com', 'x.com', 'instagram.com']) {
      expect(isBlockedDomain(d)).toBe(true)
    }
  })

  it('blocks notion + github + atlassian wildcard + slack + medium + substack', () => {
    expect(isBlockedDomain('mail.notion.so')).toBe(true)
    expect(isBlockedDomain('github.com')).toBe(true)
    expect(isBlockedDomain('foo.atlassian.net')).toBe(true)
    expect(isBlockedDomain('slack.com')).toBe(true)
    expect(isBlockedDomain('medium.com')).toBe(true)
    expect(isBlockedDomain('substack.com')).toBe(true)
  })

  it('does NOT block dealer domains', () => {
    expect(isBlockedDomain('lovelle.co.uk')).toBe(false)
    expect(isBlockedDomain('ddmresidential.co.uk')).toBe(false)
    expect(isBlockedDomain('revebatir.co.uk')).toBe(false)
  })

  it('blocks noreply-style local parts case-insensitively', () => {
    for (const l of ['noreply', 'no-reply', 'donotreply', 'NOTIFICATIONS', 'updates', 'Newsletter', 'digest', 'alerts']) {
      expect(isBlockedLocalPart(l)).toBe(true)
    }
  })

  it('does NOT block real dealer local parts', () => {
    expect(isBlockedLocalPart('holly.anderson')).toBe(false)
    expect(isBlockedLocalPart('kerry.telford')).toBe(false)
    expect(isBlockedLocalPart('lexi')).toBe(false)
  })

  it('exposes BLOCKED_DOMAINS as an array for inspection', () => {
    expect(Array.isArray(BLOCKED_DOMAINS)).toBe(true)
    expect(BLOCKED_DOMAINS.length).toBeGreaterThan(8)
  })
})
