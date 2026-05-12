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
      password: 'securepass',
      confirmPassword: 'securepass',
    })
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = stepAccountSchema.safeParse({
      email: 'jane@example.com',
      password: 'securepass',
      confirmPassword: 'different',
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
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty first name', () => {
    const result = stepPersonalSchema.safeParse({
      firstName: '',
      lastName: 'Smith',
      phone: '+447700000000',
      addressLine1: '123 Main St',
      city: 'London',
      postcode: 'E1 6AN',
    })
    expect(result.success).toBe(false)
  })
})

describe('stepCriteriaSchema', () => {
  it('accepts valid criteria', () => {
    const result = stepCriteriaSchema.safeParse({
      budgetMin: 100000,
      budgetMax: 300000,
      strategy: 'BTL',
      buyerType: 'cash',
      targetAreas: 'Manchester, Leeds',
    })
    expect(result.success).toBe(true)
  })

  it('rejects budgetMax <= budgetMin', () => {
    const result = stepCriteriaSchema.safeParse({
      budgetMin: 300000,
      budgetMax: 100000,
      strategy: 'BTL',
      buyerType: 'cash',
      targetAreas: 'Manchester',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid strategy', () => {
    const result = stepCriteriaSchema.safeParse({
      budgetMin: 100000,
      budgetMax: 300000,
      strategy: 'INVALID',
      buyerType: 'cash',
      targetAreas: 'Manchester',
    })
    expect(result.success).toBe(false)
  })
})

describe('onboardingSubmitSchema', () => {
  const VALID = {
    email: 'jane@example.com',
    password: 'securepass',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '+447700000000',
    addressLine1: '123 Main St',
    city: 'London',
    postcode: 'E1 6AN',
    budgetMin: 100000,
    budgetMax: 300000,
    strategy: 'BTL',
    buyerType: 'cash',
    targetAreas: 'Manchester, Leeds',
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
