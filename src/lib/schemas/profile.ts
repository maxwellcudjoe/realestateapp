import { z } from 'zod'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { VALID_COUNTRY_CODES, VALID_SOURCE_OF_FUNDS, NI_NUMBER_REGEX, VALID_EXPERIENCE, VALID_TIMELINE, VALID_MORTGAGE_STATUS } from '@/lib/compliance'
import { VALID_AREA_CODES } from '@/lib/target-areas'
import { VALID_STRATEGY_CODES } from '@/lib/strategies'

/** Fields the investor can self-edit. AML core (DOB, nationality, PEP) is admin-only. */
export const profileUpdateSchema = z
  .object({
    phone: z.string().min(7).max(50).refine((s) => isValidPhoneNumber(s, 'GB'), 'Invalid phone number'),
    addressLine1: z.string().min(1).max(255),
    city: z.string().min(1).max(100),
    postcode: z.string().min(1).max(20),

    budgetMin: z.number().positive(),
    budgetMax: z.number().positive(),
    strategies: z.array(z.string()).min(1).max(10)
      .refine((arr) => arr.every((s) => VALID_STRATEGY_CODES.has(s)), 'Unknown strategy'),
    buyerType: z.enum(['cash', 'mortgage']),
    targetAreaCodes: z.array(z.string()).min(1).max(50)
      .refine((arr) => arr.every((c) => VALID_AREA_CODES.has(c)), 'Unknown area'),

    experienceLevel: z.string().refine((v) => VALID_EXPERIENCE.has(v)),
    timelineToBuy: z.string().refine((v) => VALID_TIMELINE.has(v)),
    mortgageStatus: z.string().optional().default('NONE')
      .refine((v) => !v || VALID_MORTGAGE_STATUS.has(v)),
    mortgageLender: z.string().optional().default(''),
    maxLtv: z.number().int().min(0).max(100).optional(),
    depositAvailable: z.number().nonnegative().optional(),
    referralSource: z.string().max(100).optional().default(''),

    taxResidency: z.string().refine((v) => VALID_COUNTRY_CODES.includes(v)),
    niNumber: z.string().optional().default(''),
    sourceOfFunds: z.string().refine((v) => VALID_SOURCE_OF_FUNDS.includes(v)),
    sourceOfFundsDetail: z.string().optional().default(''),

    marketingConsent: z.boolean(),
  })
  .refine((d) => d.budgetMax > d.budgetMin, {
    message: 'Maximum budget must exceed minimum', path: ['budgetMax'],
  })
  .refine((d) => d.buyerType !== 'mortgage' || (d.mortgageStatus && d.mortgageStatus !== ''), {
    message: 'Mortgage status required', path: ['mortgageStatus'],
  })
  .refine((d) => d.taxResidency !== 'GB' || !d.niNumber || NI_NUMBER_REGEX.test(d.niNumber.replace(/\s+/g, '')), {
    message: 'NI number must be in the format QQ123456C', path: ['niNumber'],
  })
  .refine((d) => d.sourceOfFunds !== 'OTHER' || d.sourceOfFundsDetail.trim().length >= 5, {
    message: 'Please describe your source of funds', path: ['sourceOfFundsDetail'],
  })

export type ProfileUpdatePayload = z.infer<typeof profileUpdateSchema>
