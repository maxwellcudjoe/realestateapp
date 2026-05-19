import { describe, it, expect } from 'vitest'
import {
  mergeActivity,
  mapLoginAttempt,
  mapAudit,
  mapMessage,
  mapViewing,
  mapFavourite,
  type ActivityEvent,
} from '@/lib/user-activity'

const T = (iso: string) => new Date(iso)

const sampleEvents: ActivityEvent[] = [
  { id: 'a', kind: 'AUDIT', when: T('2026-05-19T10:00:00Z'), title: 'A', detail: null, href: null },
  { id: 'l', kind: 'LOGIN', when: T('2026-05-19T11:00:00Z'), title: 'L', detail: null, href: null },
  { id: 'v', kind: 'VIEWING', when: T('2026-05-18T09:00:00Z'), title: 'V', detail: null, href: null },
  { id: 'm', kind: 'MESSAGE', when: T('2026-05-17T08:00:00Z'), title: 'M', detail: null, href: null },
  { id: 'f', kind: 'FAVOURITE', when: T('2026-05-19T12:00:00Z'), title: 'F', detail: null, href: null },
]

describe('mergeActivity', () => {
  it('sorts events newest first', () => {
    const out = mergeActivity(sampleEvents)
    expect(out.map((e) => e.id)).toEqual(['f', 'l', 'a', 'v', 'm'])
  })

  it('filters by allowed kinds', () => {
    const out = mergeActivity(sampleEvents, new Set(['LOGIN', 'AUDIT']))
    expect(out.map((e) => e.id)).toEqual(['l', 'a'])
  })

  it('returns empty when no allowed kinds match', () => {
    expect(mergeActivity(sampleEvents, new Set([])).length).toBe(0)
  })
})

describe('mappers', () => {
  it('mapLoginAttempt success', () => {
    const e = mapLoginAttempt({
      id: '1', email: 'a@b.c', ipAddress: '1.2.3.4', success: true, reason: null, createdAt: T('2026-05-19T00:00:00Z'),
    })
    expect(e.kind).toBe('LOGIN')
    expect(e.title).toBe('Successful login')
    expect(e.detail).toBe('from 1.2.3.4')
  })

  it('mapLoginAttempt failure includes reason', () => {
    const e = mapLoginAttempt({
      id: '1', email: 'a@b.c', ipAddress: '1.2.3.4', success: false, reason: 'bad-password', createdAt: T('2026-05-19T00:00:00Z'),
    })
    expect(e.title).toBe('Failed login — bad-password')
  })

  it('mapAudit uses label lookup', () => {
    const e = mapAudit(
      { id: '1', action: 'INVOICE_ISSUED', actorUserId: 'admin1', resourceType: 'Invoice', resourceId: 'inv-1', createdAt: T('2026-05-19T00:00:00Z') },
      (a) => (a === 'INVOICE_ISSUED' ? 'Invoice issued' : a),
    )
    expect(e.kind).toBe('AUDIT')
    expect(e.title).toBe('Invoice issued')
  })

  it('mapMessage distinguishes deal vs portal', () => {
    expect(
      mapMessage({ id: '1', subject: 'Hi', applicationId: 'app1', dealId: 'd1', createdAt: T('2026-05-19T00:00:00Z') }, '/admin/x').detail,
    ).toBe('Deal message')
    expect(
      mapMessage({ id: '1', subject: 'Hi', applicationId: 'app1', dealId: null, createdAt: T('2026-05-19T00:00:00Z') }, '/admin/x').detail,
    ).toBe('Portal message')
  })

  it('mapMessage falls back when subject empty', () => {
    expect(
      mapMessage({ id: '1', subject: '', applicationId: 'app1', dealId: null, createdAt: T('2026-05-19T00:00:00Z') }, '/admin/x').title,
    ).toBe('(no subject)')
  })

  it('mapViewing renders status', () => {
    const e = mapViewing({
      id: '1', status: 'CONFIRMED', dealId: 'd1',
      requestedSlot: T('2026-06-01T10:00:00Z'), createdAt: T('2026-05-19T00:00:00Z'),
    })
    expect(e.title).toBe('Viewing confirmed')
  })

  it('mapFavourite distinguishes source', () => {
    expect(mapFavourite({ id: '1', source: 'CONTENTFUL', label: 'X', href: null, createdAt: T('2026-05-19T00:00:00Z') }).title)
      .toBe('Favourited public deal')
    expect(mapFavourite({ id: '1', source: 'DEAL', label: 'X', href: null, createdAt: T('2026-05-19T00:00:00Z') }).title)
      .toBe('Favourited deal')
  })
})
