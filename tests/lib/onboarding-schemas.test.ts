import { describe, it, expect } from 'vitest'
import {
  stepAccountSchema,
  stepPersonalSchema,
  stepCriteriaSchema,
  onboardingSubmitSchema,
} from '@/lib/schemas/onboarding'

describe('stepAccountSchema', () => {
  it('accepts valid account data', () => {
    const result = stepAccountSchema.safeParse({
      email: 'jane@example.com',
      password: 'Securepass1!',
      confirmPassword: 'Securepass1!',
    })
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = stepAccountSchema.safeParse({
      email: 'jane@example.com',
      password: 'Securepass1!',
      confirmPassword: 'Different1!',
    })
    expect(result.success).toBe(false)
  })

  it('rejects short password', () => {
    const result = stepAccountSchema.safeParse({
      email: 'jane@example.com',
      password: '1234567',
      confirmPassword: '1234567',
    })
    expect(result.success).toBe(false)
  })

  it('rejects password without a symbol', () => {
    const result = stepAccountSchema.safeParse({
      email: 'jane@example.com',
      password: 'Securepass1',
      confirmPassword: 'Securepass1',
    })
    expect(result.success).toBe(false)
  })
})

describe('stepPersonalSchema (phone validation)', () => {
  const base = { firstName: 'J', lastName: 'S', addressLine1: '1 A St', city: 'London', postcode: 'E1 6AN', entityType: 'INDIVIDUAL', companyName: '', companyNumber: '', vatNumber: '', companyAddress: '' }
  it('accepts a valid UK mobile in national format', () => {
    expect(stepPersonalSchema.safeParse({ ...base, phone: '07911 123 456' }).success).toBe(true)
  })
  it('accepts a valid UK mobile in E.164', () => {
    expect(stepPersonalSchema.safeParse({ ...base, phone: '+447911123456' }).success).toBe(true)
  })
  it('rejects garbage', () => {
    expect(stepPersonalSchema.safeParse({ ...base, phone: 'not-a-number' }).success).toBe(false)
  })
  it('rejects obviously-wrong UK number', () => {
    expect(stepPersonalSchema.safeParse({ ...base, phone: '123' }).success).toBe(false)
  })
})

describe('stepPersonalSchema', () => {
  it('accepts valid personal data', () => {
    const result = stepPersonalSchema.safeParse({
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+447700000000',
      addressLine1: '123 Main St',
      city: 'London',
      postcode: 'E1 6AN',
      entityType: 'INDIVIDUAL',
      companyName: '', companyNumber: '', vatNumber: '', companyAddress: '',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a Ltd company with valid Companies House number', () => {
    const result = stepPersonalSchema.safeParse({
      firstName: 'Jane', lastName: 'Smith',
      phone: '+447700000000', addressLine1: '1 A St', city: 'London', postcode: 'E1 6AN',
      entityType: 'LTD_COMPANY', companyName: 'Smith Property Ltd',
      companyNumber: '12345678', vatNumber: '', companyAddress: '',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a Ltd company with Scottish prefix', () => {
    const result = stepPersonalSchema.safeParse({
      firstName: 'Jane', lastName: 'Smith',
      phone: '+447700000000', addressLine1: '1 A St', city: 'Edinburgh', postcode: 'EH1 1AA',
      entityType: 'LTD_COMPANY', companyName: 'Smith Property Ltd',
      companyNumber: 'SC123456', vatNumber: '', companyAddress: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects Ltd company with missing company name', () => {
    const result = stepPersonalSchema.safeParse({
      firstName: 'Jane', lastName: 'Smith',
      phone: '+447700000000', addressLine1: '1 A St', city: 'London', postcode: 'E1 6AN',
      entityType: 'LTD_COMPANY', companyName: '',
      companyNumber: '12345678', vatNumber: '', companyAddress: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects Ltd company with malformed Companies House number', () => {
    const result = stepPersonalSchema.safeParse({
      firstName: 'Jane', lastName: 'Smith',
      phone: '+447700000000', addressLine1: '1 A St', city: 'London', postcode: 'E1 6AN',
      entityType: 'LTD_COMPANY', companyName: 'Smith Property Ltd',
      companyNumber: '123', vatNumber: '', companyAddress: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty first name', () => {
    const result = stepPersonalSchema.safeParse({
      firstName: '',
      lastName: 'Smith',
      phone: '+447700000000',
      addressLine1: '123 Main St',
      city: 'London',
      postcode: 'E1 6AN',
      entityType: 'INDIVIDUAL',
      companyName: '', companyNumber: '', vatNumber: '', companyAddress: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('stepCriteriaSchema', () => {
  it('accepts valid criteria', () => {
    const result = stepCriteriaSchema.safeParse({
      budgetMin: 100000,
      budgetMax: 300000,
      strategies: ['BTL'],
      buyerType: 'cash',
      targetAreaCodes: ['manchester', 'leeds'],
      experienceLevel: 'OWN_1_3',
      timelineToBuy: 'M_1_3',
    })
    expect(result.success).toBe(true)
  })

  it('rejects budgetMax <= budgetMin', () => {
    const result = stepCriteriaSchema.safeParse({
      budgetMin: 300000,
      budgetMax: 100000,
      strategies: ['BTL'],
      buyerType: 'cash',
      targetAreaCodes: ['manchester'],
      experienceLevel: 'OWN_1_3',
      timelineToBuy: 'M_1_3',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid strategy', () => {
    const result = stepCriteriaSchema.safeParse({
      budgetMin: 100000,
      budgetMax: 300000,
      strategies: ['INVALID'],
      buyerType: 'cash',
      targetAreaCodes: ['manchester'],
      experienceLevel: 'OWN_1_3',
      timelineToBuy: 'M_1_3',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty strategies array', () => {
    const result = stepCriteriaSchema.safeParse({
      budgetMin: 100000,
      budgetMax: 300000,
      strategies: [],
      buyerType: 'cash',
      targetAreaCodes: ['manchester'],
      experienceLevel: 'OWN_1_3',
      timelineToBuy: 'M_1_3',
    })
    expect(result.success).toBe(false)
  })

  it('accepts multiple strategies', () => {
    const result = stepCriteriaSchema.safeParse({
      budgetMin: 100000,
      budgetMax: 300000,
      strategies: ['BTL', 'HMO', 'FLIP'],
      buyerType: 'cash',
      targetAreaCodes: ['manchester'],
      experienceLevel: 'OWN_4_10',
      timelineToBuy: 'IMMEDIATE',
    })
    expect(result.success).toBe(true)
  })

  it('requires mortgageStatus when buyerType=mortgage', () => {
    const result = stepCriteriaSchema.safeParse({
      budgetMin: 100000,
      budgetMax: 300000,
      strategies: ['BTL'],
      buyerType: 'mortgage',
      targetAreaCodes: ['manchester'],
      experienceLevel: 'OWN_1_3',
      timelineToBuy: 'M_1_3',
      mortgageStatus: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('onboardingSubmitSchema', () => {
  const VALID = {
    email: 'jane@example.com',
    password: 'Securepass1!',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '+447700000000',
    addressLine1: '123 Main St',
    city: 'London',
    postcode: 'E1 6AN',
    budgetMin: 100000,
    budgetMax: 300000,
    strategies: ['BTL'],
    buyerType: 'cash',
    targetAreaCodes: ['manchester', 'leeds'],
    experienceLevel: 'OWN_1_3',
    timelineToBuy: 'M_1_3',
    mortgageStatus: 'NONE',
    mortgageLender: '',
    referralSource: '',
    entityType: 'INDIVIDUAL',
    companyName: '',
    companyNumber: '',
    vatNumber: '',
    companyAddress: '',
    // Compliance fields
    dateOfBirth: '1990-01-01',
    nationality: 'GB',
    taxResidency: 'GB',
    niNumber: 'AB123456C',
    isPep: false,
    pepDetails: '',
    sourceOfFunds: 'SAVINGS',
    sourceOfFundsDetail: '',
    agreedToTerms: true,
    agreedToPrivacy: true,
    agreedToAccuracy: true,
    agreedToAge: true,
  }

  it('accepts a complete valid payload', () => {
    expect(onboardingSubmitSchema.safeParse(VALID).success).toBe(true)
  })

  it('rejects missing agreement', () => {
    const result = onboardingSubmitSchema.safeParse({ ...VALID, agreedToTerms: false })
    expect(result.success).toBe(false)
  })
})
