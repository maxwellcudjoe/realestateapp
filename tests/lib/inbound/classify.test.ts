import { describe, it, expect } from 'vitest'
import { classify } from '@/lib/inbound/classify'
import type { ParsedEmail } from '@/lib/inbound/types'
import lovelleHolly from '../../fixtures/inbound/lovelle-holly.json'
import lovelleKerry from '../../fixtures/inbound/lovelle-kerry.json'
import ddmLexi from '../../fixtures/inbound/ddm-lexi.json'
import fb from '../../fixtures/inbound/facebook-notification.json'
import li from '../../fixtures/inbound/linkedin-digest.json'
import mc from '../../fixtures/inbound/mailchimp-newsletter.json'
import noreply from '../../fixtures/inbound/noreply-update.json'
import unsolicited from '../../fixtures/inbound/unsolicited-list.json'

const asEmail = (j: unknown): ParsedEmail => ({
  ...(j as ParsedEmail),
  receivedAt: new Date((j as { receivedAt: string }).receivedAt),
})

describe('classify', () => {
  it('KEEPS the three real dealer examples', () => {
    expect(classify(asEmail(lovelleHolly))).toBe('KEPT')
    expect(classify(asEmail(lovelleKerry))).toBe('KEPT')
    expect(classify(asEmail(ddmLexi))).toBe('KEPT')
  })

  it('DROPS facebook + linkedin notifications via domain blocklist', () => {
    expect(classify(asEmail(fb))).toBe('DROPPED_MARKETING')
    expect(classify(asEmail(li))).toBe('DROPPED_MARKETING')
  })

  it('DROPS mailchimp via domain blocklist', () => {
    expect(classify(asEmail(mc))).toBe('DROPPED_MARKETING')
  })

  it('DROPS noreply via local-part rule', () => {
    expect(classify(asEmail(noreply))).toBe('DROPPED_AUTO')
  })

  it('DROPS unsolicited mailing list (List-Unsubscribe + no In-Reply-To)', () => {
    expect(classify(asEmail(unsolicited))).toBe('DROPPED_MARKETING')
  })

  it('DROPS by subject newsletter regex', () => {
    const e: ParsedEmail = {
      ...asEmail(lovelleHolly),
      subject: 'Weekly update from us',
      from: { email: 'someone@unknown.com', name: null },
      inReplyTo: null,
    }
    expect(classify(e)).toBe('DROPPED_MARKETING')
  })

  it('KEEPS replies even if List-Unsubscribe present (has In-Reply-To)', () => {
    const e: ParsedEmail = {
      ...asEmail(lovelleHolly),
      rawHeaders: { 'List-Unsubscribe': '<mailto:x@y>' },
    }
    expect(classify(e)).toBe('KEPT')
  })

  it('KEEPS a human reply that contains "unsubscribe" in the subject', () => {
    const e: ParsedEmail = {
      ...asEmail(lovelleHolly),
      subject: 'Re: please unsubscribe me from your viewing list',
    }
    expect(classify(e)).toBe('KEPT')
  })

  it('KEEPS a reply whose subject mentions "newsletter" (subject regex gated by inReplyTo)', () => {
    const e: ParsedEmail = {
      ...asEmail(lovelleHolly), // has inReplyTo set
      subject: 'Re: your newsletter about 16 Grimsby Rd',
    }
    expect(classify(e)).toBe('KEPT')
  })
})
