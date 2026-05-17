import { z } from 'zod'
import {
  VALID_COUNTRY_CODES,
  VALID_SOURCE_OF_FUNDS,
  VALID_EXPERIENCE,
  VALID_TIMELINE,
  VALID_MORTGAGE_STATUS,
  NI_NUMBER_REGEX,
  ageOn,
} from '@/lib/compliance'
import { VALID_AREA_CODES } from '@/lib/target-areas'
import { VALID_STRATEGY_CODES } from '@/lib/strategies'
import { isValidPhoneNumber } from 'libphonenumber-js'

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/\d/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a symbol')

export const stepAccountSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const stepPersonalSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z
    .string()
    .min(7, 'Invalid phone number')
    .max(50)
    .refine((s) => isValidPhoneNumber(s, 'GB'), 'Enter a valid phone number (e.g. 07700 900 000 or +44 7700 900 000)'),
  addressLine1: z.string().min(1, 'Address is required').max(255),
  city: z.string().min(1, 'City is required').max(100),
  postcode: z.string().min(1, 'Postcode is required').max(20),
})

export const stepComplianceSchema = z
  .object({
    dateOfBirth: z
      .string()
      .min(1, 'Date of birth is required')
      .refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date'),
    nationality: z
      .string()
      .refine((v) => VALID_COUNTRY_CODES.includes(v), 'Select your nationality'),
    taxResidency: z
      .string()
      .refine((v) => VALID_COUNTRY_CODES.includes(v), 'Select your tax residency'),
    niNumber: z.string().optional().default(''),
    isPep: z.boolean(),
    pepDetails: z.string().optional().default(''),
    sourceOfFunds: z
      .string()
      .refine((v) => VALID_SOURCE_OF_FUNDS.includes(v), 'Please select a source of funds'),
    sourceOfFundsDetail: z.string().optional().default(''),
  })
  .refine((d) => ageOn(new Date(d.dateOfBirth)) >= 18, {
    message: 'You must be at least 18 years old',
    path: ['dateOfBirth'],
  })
  .refine((d) => ageOn(new Date(d.dateOfBirth)) < 120, {
    message: 'Please enter a valid date of birth',
    path: ['dateOfBirth'],
  })
  .refine((d) => d.taxResidency !== 'GB' || !d.niNumber || NI_NUMBER_REGEX.test(d.niNumber.replace(/\s+/g, '')), {
    message: 'NI number must be in the format QQ123456C',
    path: ['niNumber'],
  })
  .refine((d) => !d.isPep || d.pepDetails.trim().length >= 5, {
    message: 'Please provide brief details of your PEP status',
    path: ['pepDetails'],
  })
  .refine((d) => d.sourceOfFunds !== 'OTHER' || d.sourceOfFundsDetail.trim().length >= 5, {
    message: 'Please describe your source of funds',
    path: ['sourceOfFundsDetail'],
  })

export const stepCriteriaSchema = z
  .object({
    budgetMin: z.number().positive('Minimum budget must be positive'),
    budgetMax: z.number().positive('Maximum budget must be positive'),
    strategies: z
      .array(z.string())
      .min(1, 'Select at least one strategy')
      .max(10)
      .refine((arr) => arr.every((s) => VALID_STRATEGY_CODES.has(s)), 'Unknown strategy selected'),
    buyerType: z.enum(['cash', 'mortgage']),
    targetAreaCodes: z
      .array(z.string())
      .min(1, 'Select at least one target area')
      .max(50)
      .refine((arr) => arr.every((c) => VALID_AREA_CODES.has(c)), 'Unknown area selected'),
    experienceLevel: z.string().refine((v) => VALID_EXPERIENCE.has(v), 'Select your experience level'),
    timelineToBuy: z.string().refine((v) => VALID_TIMELINE.has(v), 'Select your timeline'),
    mortgageStatus: z.string().optional().default('NONE')
      .refine((v) => !v || VALID_MORTGAGE_STATUS.has(v), 'Invalid mortgage status'),
    mortgageLender: z.string().optional().default(''),
    maxLtv: z.number().int().min(0).max(100).optional(),
    depositAvailable: z.number().nonnegative().optional(),
    referralSource: z.string().max(100).optional().default(''),
  })
  .refine((d) => d.budgetMax > d.budgetMin, {
    message: 'Maximum budget must be greater than minimum budget',
    path: ['budgetMax'],
  })
  .refine((d) => d.buyerType !== 'mortgage' || (d.mortgageStatus && d.mortgageStatus !== ''), {
    message: 'Please indicate your mortgage status',
    path: ['mortgageStatus'],
  })

export const VALID_BUYER_TYPES = ['cash', 'mortgage'] as const

export const onboardingSubmitSchema = z
  .object({
    email: z.string().email(),
    password: passwordSchema,
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phone: z.string().min(7).max(50).refine((s) => isValidPhoneNumber(s, 'GB'), 'Invalid phone number'),
    addressLine1: z.string().min(1).max(255),
    city: z.string().min(1).max(100),
    postcode: z.string().min(1).max(20),
    budgetMin: z.number().positive(),
    budgetMax: z.number().positive(),
    strategies: z
      .array(z.string())
      .min(1, 'Select at least one strategy')
      .max(10)
      .refine((arr) => arr.every((s) => VALID_STRATEGY_CODES.has(s)), 'Unknown strategy selected'),
    buyerType: z.enum(['cash', 'mortgage']),
    targetAreaCodes: z
      .array(z.string())
      .min(1, 'Select at least one target area')
      .max(50)
      .refine((arr) => arr.every((c) => VALID_AREA_CODES.has(c)), 'Unknown area selected'),
    experienceLevel: z.string().refine((v) => VALID_EXPERIENCE.has(v)),
    timelineToBuy: z.string().refine((v) => VALID_TIMELINE.has(v)),
    mortgageStatus: z.string().optional().default('NONE')
      .refine((v) => !v || VALID_MORTGAGE_STATUS.has(v)),
    mortgageLender: z.string().optional().default(''),
    maxLtv: z.number().int().min(0).max(100).optional(),
    depositAvailable: z.number().nonnegative().optional(),
    referralSource: z.string().max(100).optional().default(''),
    // Compliance fields (Task 1.4)
    dateOfBirth: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date'),
    nationality: z.string().refine((v) => VALID_COUNTRY_CODES.includes(v)),
    taxResidency: z.string().refine((v) => VALID_COUNTRY_CODES.includes(v)),
    niNumber: z.string().optional().default(''),
    isPep: z.boolean(),
    pepDetails: z.string().optional().default(''),
    sourceOfFunds: z.string().refine((v) => VALID_SOURCE_OF_FUNDS.includes(v)),
    sourceOfFundsDetail: z.string().optional().default(''),
    agreedToTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must agree to the Terms & Conditions' }),
    }),
    agreedToPrivacy: z.literal(true, {
      errorMap: () => ({ message: 'You must agree to the Privacy Policy' }),
    }),
    agreedToAccuracy: z.literal(true),
    agreedToAge: z.literal(true),
    agreedToMarketing: z.boolean().optional().default(false),
  })
  .refine((d) => d.budgetMax > d.budgetMin, {
    message: 'Maximum budget must exceed minimum',
    path: ['budgetMax'],
  })
  .refine((d) => ageOn(new Date(d.dateOfBirth)) >= 18, {
    message: 'You must be at least 18 years old',
    path: ['dateOfBirth'],
  })
  .refine((d) => !d.isPep || d.pepDetails.trim().length >= 5, {
    message: 'Please provide brief details of your PEP status',
    path: ['pepDetails'],
  })
  .refine((d) => d.sourceOfFunds !== 'OTHER' || d.sourceOfFundsDetail.trim().length >= 5, {
    message: 'Please describe your source of funds',
    path: ['sourceOfFundsDetail'],
  })

export type StepAccountData = z.infer<typeof stepAccountSchema>
export type StepComplianceData = z.infer<typeof stepComplianceSchema>
export type StepPersonalData = z.infer<typeof stepPersonalSchema>
export type StepCriteriaData = z.infer<typeof stepCriteriaSchema>
export type OnboardingPayload = z.infer<typeof onboardingSubmitSchema>
