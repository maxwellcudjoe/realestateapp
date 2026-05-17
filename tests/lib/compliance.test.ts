import { describe, it, expect } from 'vitest'
import { stepComplianceSchema } from '@/lib/schemas/onboarding'
import { ageOn, looksLikeNiNumber, COUNTRIES, SOURCE_OF_FUNDS_OPTIONS } from '@/lib/compliance'

describe('ageOn', () => {
  it('computes age correctly across leap day', () => {
    expect(ageOn(new Date('1990-01-01'), new Date('2026-05-17'))).toBe(36)
    expect(ageOn(new Date('1990-06-01'), new Date('2026-05-17'))).toBe(35)
    expect(ageOn(new Date('2008-05-17'), new Date('2026-05-17'))).toBe(18)
  })
})

describe('looksLikeNiNumber', () => {
  it('accepts valid UK NI numbers', () => {
    expect(looksLikeNiNumber('AB123456C')).toBe(true)
    expect(looksLikeNiNumber('JM 12 34 56 C')).toBe(true)
  })
  it('rejects invalid formats', () => {
    expect(looksLikeNiNumber('123456789')).toBe(false)
    expect(looksLikeNiNumber('AB12345')).toBe(false)
    expect(looksLikeNiNumber('DA123456C')).toBe(false) // 'D' not allowed in first letter
  })
})

describe('constant lookups', () => {
  it('country list contains GB and OT', () => {
    const codes = COUNTRIES.map((c) => c.code)
    expect(codes).toContain('GB')
    expect(codes).toContain('OT')
  })
  it('source-of-funds includes SAVINGS and OTHER', () => {
    const values = SOURCE_OF_FUNDS_OPTIONS.map((o) => o.value)
    expect(values).toContain('SAVINGS')
    expect(values).toContain('OTHER')
  })
})

describe('stepComplianceSchema', () => {
  const BASE = {
    dateOfBirth: '1990-01-01',
    nationality: 'GB',
    taxResidency: 'GB',
    niNumber: 'AB123456C',
    isPep: false,
    pepDetails: '',
    sourceOfFunds: 'SAVINGS',
    sourceOfFundsDetail: '',
  }

  it('accepts a complete valid payload', () => {
    expect(stepComplianceSchema.safeParse(BASE).success).toBe(true)
  })

  it('rejects under-18 DOB', () => {
    const today = new Date()
    const tooYoung = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate())
      .toISOString().slice(0, 10)
    expect(stepComplianceSchema.safeParse({ ...BASE, dateOfBirth: tooYoung }).success).toBe(false)
  })

  it('rejects absurd DOB (over 120)', () => {
    expect(stepComplianceSchema.safeParse({ ...BASE, dateOfBirth: '1850-01-01' }).success).toBe(false)
  })

  it('requires PEP details when isPep=true', () => {
    expect(stepComplianceSchema.safeParse({ ...BASE, isPep: true, pepDetails: '' }).success).toBe(false)
    expect(stepComplianceSchema.safeParse({ ...BASE, isPep: true, pepDetails: 'My father was an MP' }).success).toBe(true)
  })

  it('requires sourceOfFundsDetail when OTHER selected', () => {
    expect(stepComplianceSchema.safeParse({ ...BASE, sourceOfFunds: 'OTHER', sourceOfFundsDetail: '' }).success).toBe(false)
    expect(stepComplianceSchema.safeParse({ ...BASE, sourceOfFunds: 'OTHER', sourceOfFundsDetail: 'Long story here' }).success).toBe(true)
  })

  it('rejects malformed NI number when taxResidency=GB', () => {
    expect(stepComplianceSchema.safeParse({ ...BASE, niNumber: 'not-an-ni' }).success).toBe(false)
  })

  it('allows missing NI number even for GB taxResidency', () => {
    expect(stepComplianceSchema.safeParse({ ...BASE, niNumber: '' }).success).toBe(true)
  })

  it('ignores NI number validation when taxResidency is non-GB', () => {
    expect(stepComplianceSchema.safeParse({
      ...BASE, taxResidency: 'US', niNumber: 'not-formatted-as-uk-ni',
    }).success).toBe(true)
  })

  it('rejects unknown country code', () => {
    expect(stepComplianceSchema.safeParse({ ...BASE, nationality: 'XX' }).success).toBe(false)
  })
})
