import { describe, it, expect } from 'vitest'
import {
  adminProfileUpdateSchema,
  touchedAmlFields,
  computeDiff,
  AML_CORE_FIELDS,
} from '@/lib/schemas/admin-profile'

describe('adminProfileUpdateSchema', () => {
  it('accepts a minimal change', () => {
    const r = adminProfileUpdateSchema.safeParse({ city: 'Manchester' })
    expect(r.success).toBe(true)
  })

  it('accepts empty body (no fields)', () => {
    expect(adminProfileUpdateSchema.safeParse({}).success).toBe(true)
  })

  it('rejects invalid phone', () => {
    const r = adminProfileUpdateSchema.safeParse({ phone: 'not-a-phone' })
    expect(r.success).toBe(false)
  })

  it('rejects budgetMin > budgetMax', () => {
    const r = adminProfileUpdateSchema.safeParse({ budgetMin: 500_000, budgetMax: 100_000 })
    expect(r.success).toBe(false)
  })

  it('rejects invalid country code', () => {
    const r = adminProfileUpdateSchema.safeParse({ nationality: 'XX' })
    expect(r.success).toBe(false)
  })

  it('rejects under-18 date of birth', () => {
    const fiveYearsAgo = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString()
    const r = adminProfileUpdateSchema.safeParse({ dateOfBirth: fiveYearsAgo })
    expect(r.success).toBe(false)
  })

  it('accepts a valid adult DOB', () => {
    const dob = new Date('1985-06-15').toISOString()
    const r = adminProfileUpdateSchema.safeParse({ dateOfBirth: dob })
    expect(r.success).toBe(true)
  })

  it('rejects malformed NI number', () => {
    const r = adminProfileUpdateSchema.safeParse({ niNumber: '123' })
    expect(r.success).toBe(false)
  })

  it('accepts valid NI number', () => {
    const r = adminProfileUpdateSchema.safeParse({ niNumber: 'AB123456C' })
    expect(r.success).toBe(true)
  })

  it('rejects malformed companies house number when LTD_COMPANY', () => {
    const r = adminProfileUpdateSchema.safeParse({ entityType: 'LTD_COMPANY', companyNumber: '12' })
    expect(r.success).toBe(false)
  })

  it('accepts Scottish company number', () => {
    const r = adminProfileUpdateSchema.safeParse({ entityType: 'LTD_COMPANY', companyNumber: 'SC123456' })
    expect(r.success).toBe(true)
  })
})

describe('touchedAmlFields', () => {
  it('returns only AML-core keys present in input', () => {
    expect(touchedAmlFields({ firstName: 'Jane', niNumber: 'AB123456C' })).toEqual(['niNumber'])
    expect(touchedAmlFields({ firstName: 'Jane' })).toEqual([])
    expect(touchedAmlFields({ isPep: true, sourceOfFunds: 'SAVINGS', city: 'London' }).sort())
      .toEqual(['isPep', 'sourceOfFunds'])
  })

  it('AML_CORE_FIELDS is the documented set', () => {
    expect(AML_CORE_FIELDS.has('dateOfBirth')).toBe(true)
    expect(AML_CORE_FIELDS.has('nationality')).toBe(true)
    expect(AML_CORE_FIELDS.has('taxResidency')).toBe(true)
    expect(AML_CORE_FIELDS.has('niNumber')).toBe(true)
    expect(AML_CORE_FIELDS.has('isPep')).toBe(true)
    expect(AML_CORE_FIELDS.has('pepDetails')).toBe(true)
    expect(AML_CORE_FIELDS.has('sourceOfFunds')).toBe(true)
    expect(AML_CORE_FIELDS.has('sourceOfFundsDetail')).toBe(true)
    expect(AML_CORE_FIELDS.has('firstName')).toBe(false)
    expect(AML_CORE_FIELDS.has('city')).toBe(false)
  })
})

describe('computeDiff', () => {
  it('returns empty diff when nothing changed', () => {
    expect(computeDiff({ firstName: 'Jane' }, { firstName: 'Jane' })).toEqual({})
  })

  it('returns before/after for changed fields', () => {
    expect(computeDiff({ firstName: 'Jane', city: 'London' }, { firstName: 'Janet' }))
      .toEqual({ firstName: { before: 'Jane', after: 'Janet' } })
  })

  it('treats null and undefined symmetrically', () => {
    expect(computeDiff({ niNumber: null }, { niNumber: null })).toEqual({})
  })

  it('normalises Date values to ISO strings', () => {
    const before = new Date('1985-06-15T00:00:00Z')
    const out = computeDiff({ dateOfBirth: before }, { dateOfBirth: '1986-06-15T00:00:00.000Z' })
    expect(out.dateOfBirth.before).toBe(before.toISOString())
    expect(out.dateOfBirth.after).toBe('1986-06-15T00:00:00.000Z')
  })

  it('skips the reason key', () => {
    expect(computeDiff({ firstName: 'Jane' }, { reason: 'typo fix', firstName: 'Janet' }))
      .toEqual({ firstName: { before: 'Jane', after: 'Janet' } })
  })
})
