import { describe, it, expect } from 'vitest'
import { resolveThread, normaliseSubject, type ThreadLookups } from '@/lib/inbound/thread'

const noLookups: ThreadLookups = {
  findThreadByMessageId: async () => null,
}

describe('normaliseSubject', () => {
  it('strips RE: / Re: / FW: / Fwd: prefixes including repeats', () => {
    expect(normaliseSubject('RE: RE: FW: 16 Grimsby Road')).toBe('16 Grimsby Road')
    expect(normaliseSubject('Re: Fwd: Hello')).toBe('Hello')
  })

  it('strips *EXTERNAL* markers', () => {
    expect(normaliseSubject('RE: RE: *EXTERNAL* 16 Grimsby')).toBe('16 Grimsby')
    expect(normaliseSubject('*EXTERNAL*16 Grimsby')).toBe('16 Grimsby')
    expect(normaliseSubject('RE: *EXTERNAL*16 Grimsby Road')).toBe('16 Grimsby Road')
  })

  it('leaves a clean subject alone', () => {
    expect(normaliseSubject('Property enquiry')).toBe('Property enquiry')
  })

  it('handles empty / whitespace input', () => {
    expect(normaliseSubject('')).toBe('')
    expect(normaliseSubject('   ')).toBe('')
  })
})

describe('resolveThread', () => {
  it('attaches to existing thread when In-Reply-To matches', async () => {
    const r = await resolveThread(
      { messageId: '<new@x>', inReplyTo: '<old@x>', references: [], subject: 'RE: foo' },
      {
        findThreadByMessageId: async (mid) =>
          mid === '<old@x>' ? { id: 't1', dealId: 'd1' } : null,
      },
    )
    expect(r).toEqual({ threadId: 't1', isNew: false, normalisedSubject: 'foo' })
  })

  it('attaches via References (rightmost) if In-Reply-To misses', async () => {
    const r = await resolveThread(
      { messageId: '<new@x>', inReplyTo: null, references: ['<a@x>', '<b@x>'], subject: 'foo' },
      {
        findThreadByMessageId: async (mid) => (mid === '<b@x>' ? { id: 't2', dealId: null } : null),
      },
    )
    expect(r.threadId).toBe('t2')
    expect(r.isNew).toBe(false)
  })

  it('signals new thread when nothing matches', async () => {
    const r = await resolveThread(
      { messageId: '<new@x>', inReplyTo: null, references: [], subject: '*EXTERNAL* RE: brand new' },
      noLookups,
    )
    expect(r).toEqual({ threadId: '', isNew: true, normalisedSubject: 'brand new' })
  })

  it('prefers In-Reply-To over References when both match different threads', async () => {
    const r = await resolveThread(
      { messageId: '<new@x>', inReplyTo: '<a@x>', references: ['<b@x>'], subject: 'x' },
      {
        findThreadByMessageId: async (mid) => {
          if (mid === '<a@x>') return { id: 't-from-irt', dealId: null }
          if (mid === '<b@x>') return { id: 't-from-refs', dealId: null }
          return null
        },
      },
    )
    expect(r.threadId).toBe('t-from-irt')
  })
})
