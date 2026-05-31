import { describe, it, expect } from 'vitest'
import { detectDirection } from '@/lib/inbound/direction'
import type { ParsedEmail } from '@/lib/inbound/types'

const base = (fromEmail: string): ParsedEmail => ({
  messageId: '<x>',
  inReplyTo: null,
  references: [],
  from: { email: fromEmail, name: null },
  to: [],
  cc: [],
  subject: '',
  bodyText: '',
  bodyHtml: null,
  receivedAt: new Date(),
  attachments: [],
  rawHeaders: {},
})

describe('detectDirection', () => {
  it('returns OUTBOUND when sender domain is in INTERNAL_DOMAINS', () => {
    const r = detectDirection(base('admin@revebatir.co.uk'), 'revebatir.co.uk,cudjoemaxwell@gmail.com')
    expect(r.direction).toBe('OUTBOUND')
    expect(r.attributedUserEmail).toBe('admin@revebatir.co.uk')
  })

  it('returns OUTBOUND when sender matches a bare-address entry', () => {
    const r = detectDirection(base('cudjoemaxwell@gmail.com'), 'revebatir.co.uk,cudjoemaxwell@gmail.com')
    expect(r.direction).toBe('OUTBOUND')
    expect(r.attributedUserEmail).toBe('cudjoemaxwell@gmail.com')
  })

  it('returns INBOUND for a real dealer', () => {
    const r = detectDirection(base('holly.anderson@lovelle.co.uk'), 'revebatir.co.uk')
    expect(r.direction).toBe('INBOUND')
    expect(r.attributedUserEmail).toBeNull()
  })

  it('handles empty/missing INTERNAL_DOMAINS as INBOUND', () => {
    const r = detectDirection(base('anyone@anywhere.com'), '')
    expect(r.direction).toBe('INBOUND')
    expect(r.attributedUserEmail).toBeNull()
  })

  it('is case-insensitive on domain comparison', () => {
    const r = detectDirection(base('Maxwell@RevEbatir.Co.UK'), 'revebatir.co.uk')
    expect(r.direction).toBe('OUTBOUND')
  })

  it('whitespace in INTERNAL_DOMAINS entries is trimmed', () => {
    const r = detectDirection(base('admin@revebatir.co.uk'), ' revebatir.co.uk , other.com ')
    expect(r.direction).toBe('OUTBOUND')
  })
})
