import { describe, it, expect } from 'vitest'
import { matchToDeal, type DealLookups } from '@/lib/inbound/match'
import type { ParsedEmail } from '@/lib/inbound/types'

const baseEmail = (overrides: Partial<ParsedEmail> = {}): ParsedEmail => ({
  messageId: '<m>',
  inReplyTo: null,
  references: [],
  from: { email: 'holly@lovelle.co.uk', name: 'Holly' },
  to: [],
  cc: [],
  subject: '',
  bodyText: '',
  bodyHtml: null,
  receivedAt: new Date(),
  attachments: [],
  rawHeaders: {},
  ...overrides,
})

const noLookups: DealLookups = {
  findThreadByMessageId: async () => null,
  findDealByPostcode: async () => [],
  findDealByAddress: async () => null,
  findDealsByDealerEmail: async () => [],
}

describe('matchToDeal', () => {
  it('matches via In-Reply-To when thread already linked to a deal', async () => {
    const r = await matchToDeal(baseEmail({ inReplyTo: '<rb-001@x>' }), {
      ...noLookups,
      findThreadByMessageId: async (mid) =>
        mid === '<rb-001@x>' ? { id: 't1', dealId: 'deal-A' } : null,
    })
    expect(r).toEqual({ dealId: 'deal-A', confidence: 'HIGH' })
  })

  it('matches via UK postcode in subject', async () => {
    const r = await matchToDeal(baseEmail({ subject: 'RE: 16 Grimsby Road, Cleethorpes DN35 8AB' }), {
      ...noLookups,
      findDealByPostcode: async (pc) =>
        pc === 'DN35 8AB' ? [{ id: 'deal-B', address: '16 Grimsby Road, Cleethorpes, DN35 8AB' }] : [],
    })
    expect(r).toEqual({ dealId: 'deal-B', confidence: 'HIGH' })
  })

  it('NONE when postcode lookup returns multiple deals (ambiguous)', async () => {
    const r = await matchToDeal(baseEmail({ subject: 'RE: High Street DN35 8AB' }), {
      ...noLookups,
      findDealByPostcode: async () => [
        { id: 'd1', address: '1 High Street DN35 8AB' },
        { id: 'd2', address: '2 High Street DN35 8AB' },
      ],
    })
    expect(r.confidence).toBe('NONE')
    expect(r.dealId).toBeNull()
  })

  it('matches via dealer with one open deal', async () => {
    const r = await matchToDeal(baseEmail({ subject: 'no postcode here' }), {
      ...noLookups,
      findDealsByDealerEmail: async (e) => (e === 'holly@lovelle.co.uk' ? [{ id: 'deal-C' }] : []),
    })
    expect(r).toEqual({ dealId: 'deal-C', confidence: 'MEDIUM' })
  })

  it('NONE when dealer has multiple open deals (ambiguous)', async () => {
    const r = await matchToDeal(baseEmail(), {
      ...noLookups,
      findDealsByDealerEmail: async () => [{ id: 'd1' }, { id: 'd2' }],
    })
    expect(r).toEqual({ dealId: null, confidence: 'NONE' })
  })

  it('falls back to NONE when nothing matches', async () => {
    const r = await matchToDeal(baseEmail(), noLookups)
    expect(r).toEqual({ dealId: null, confidence: 'NONE' })
  })

  it('extracts postcode case-insensitively', async () => {
    const r = await matchToDeal(baseEmail({ subject: 'Property at dn35 8ab' }), {
      ...noLookups,
      findDealByPostcode: async (pc) => (pc === 'DN35 8AB' ? [{ id: 'deal-D', address: '' }] : []),
    })
    expect(r.dealId).toBe('deal-D')
  })

  it('lowercases the dealer email before lookup', async () => {
    const received: string[] = []
    await matchToDeal(baseEmail({ from: { email: 'Holly@Lovelle.Co.UK', name: null } }), {
      ...noLookups,
      findDealsByDealerEmail: async (e) => {
        received.push(e)
        return []
      },
    })
    expect(received).toContain('holly@lovelle.co.uk')
  })
})
