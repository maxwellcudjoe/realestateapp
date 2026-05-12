import { z } from 'zod'

export const stepAccountSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const stepPersonalSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().min(7, 'Invalid phone number').max(50),
  addressLine1: z.string().min(1, 'Address is required').max(255),
  city: z.string().min(1, 'City is required').max(100),
  postcode: z.string().min(1, 'Postcode is required').max(20),
})

export const stepCriteriaSchema = z
  .object({
    budgetMin: z.number().positive('Minimum budget must be positive'),
    budgetMax: z.number().positive('Maximum budget must be positive'),
    strategy: z.enum(['BTL', 'HMO', 'Flip', 'Any']),
    buyerType: z.enum(['cash', 'mortgage']),
    targetAreas: z.string().min(1, 'Please enter at least one target area').max(500),
  })
  .refine((d) => d.budgetMax > d.budgetMin, {
    message: 'Maximum budget must be greater than minimum budget',
    path: ['budgetMax'],
  })

export const VALID_STRATEGIES = ['BTL', 'HMO', 'Flip', 'Any'] as const
export const VALID_BUYER_TYPES = ['cash', 'mortgage'] as const

export const onboardingSubmitSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phone: z.string().min(7).max(50),
    addressLine1: z.string().min(1).max(255),
    city: z.string().min(1).max(100),
    postcode: z.string().min(1).max(20),
    budgetMin: z.number().positive(),
    budgetMax: z.number().positive(),
    strategy: z.enum(['BTL', 'HMO', 'Flip', 'Any']),
    buyerType: z.enum(['cash', 'mortgage']),
    targetAreas: z.string().min(1).max(500),
    agreedToTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must agree to the Terms & Conditions' }),
    }),
    agreedToPrivacy: z.literal(true, {
      errorMap: () => ({ message: 'You must agree to the Privacy Policy' }),
    }),
    agreedToAccuracy: z.literal(true),
    agreedToAge: z.literal(true),
  })
  .refine((d) => d.budgetMax > d.budgetMin, {
    message: 'Maximum budget must exceed minimum',
    path: ['budgetMax'],
  })

export type StepAccountData = z.infer<typeof stepAccountSchema>
export type StepPersonalData = z.infer<typeof stepPersonalSchema>
export type StepCriteriaData = z.infer<typeof stepCriteriaSchema>
export type OnboardingPayload = z.infer<typeof onboardingSubmitSchema>
