import { describe, it, expect } from 'vitest'
import { findLeadForEmail, type LeadLookup } from '@/lib/leads/match'

const empty: LeadLookup = { findOldestUnconvertedLeadByEmail: async () => null }

describe('findLeadForEmail', () => {
  it('returns null when email is empty/null/undefined', async () => {
    expect(await findLeadForEmail('', empty)).toBeNull()
    expect(await findLeadForEmail(null as unknown as string, empty)).toBeNull()
    expect(await findLeadForEmail(undefined as unknown as string, empty)).toBeNull()
  })

  it('lowercases the email before lookup', async () => {
    const received: string[] = []
    const lookup: LeadLookup = {
      findOldestUnconvertedLeadByEmail: async (e) => {
        received.push(e)
        return null
      },
    }
    await findLeadForEmail('Holly@Lovelle.CO.UK', lookup)
    expect(received).toEqual(['holly@lovelle.co.uk'])
  })

  it('returns the lead row when one matches', async () => {
    const lookup: LeadLookup = {
      findOldestUnconvertedLeadByEmail: async (e) =>
        e === 'a@b.com' ? { id: 'lead-1', email: 'a@b.com' } : null,
    }
    const r = await findLeadForEmail('a@b.com', lookup)
    expect(r?.id).toBe('lead-1')
  })

  it('trims whitespace around the input email', async () => {
    const lookup: LeadLookup = {
      findOldestUnconvertedLeadByEmail: async (e) =>
        e === 'a@b.com' ? { id: 'lead-1', email: 'a@b.com' } : null,
    }
    const r = await findLeadForEmail('  A@B.COM  ', lookup)
    expect(r?.id).toBe('lead-1')
  })
})
