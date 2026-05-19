import { z } from 'zod'
import {
  VALID_COUNTRY_CODES, VALID_SOURCE_OF_FUNDS, VALID_ENTITY_TYPES,
  VALID_EXPERIENCE, VALID_TIMELINE, VALID_MORTGAGE_STATUS,
  NI_NUMBER_REGEX, COMPANY_NUMBER_REGEX, ageOn,
} from '@/lib/compliance'
import { isValidPhoneNumber } from 'libphonenumber-js'

/**
 * Field set the admin can edit. Subset of InvestorProfile.
 *
 * Notable exclusions:
 *   - `complianceCompleted` — set by the AML-completion flow, not admin-toggleable
 *   - `marketingConsentAt` — user-controlled consent, not admin-overridable
 *   - `strategy` (legacy) — derived from structured strategies
 *   - structured strategies + target areas — separate UI (add/remove of related rows)
 *
 * Fields in AML_CORE_FIELDS require a `reason` on update.
 */
export const AML_CORE_FIELDS = new Set<string>([
  'dateOfBirth', 'nationality', 'taxResidency', 'niNumber',
  'isPep', 'pepDetails', 'sourceOfFunds', 'sourceOfFundsDetail',
])

const optionalIso = z.string().datetime().or(z.literal('')).optional().nullable()

export const adminProfileUpdateSchema = z.object({
  reason: z.string().min(3).max(500).optional(),

  // Identity
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  addressLine1: z.string().min(1).max(255).optional(),
  city: z.string().min(1).max(100).optional(),
  postcode: z.string().min(1).max(20).optional(),

  // Entity (Task 2.3)
  entityType: z.string().optional(),
  companyName: z.string().max(200).nullable().optional(),
  companyNumber: z.string().max(20).nullable().optional(),
  vatNumber: z.string().max(20).nullable().optional(),
  companyAddress: z.string().max(500).nullable().optional(),

  // Investment
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().positive().optional(),
  buyerType: z.enum(['cash', 'mortgage']).optional(),

  // AML
  dateOfBirth: optionalIso,
  nationality: z.string().nullable().optional(),
  taxResidency: z.string().nullable().optional(),
  niNumber: z.string().max(20).nullable().optional(),
  isPep: z.boolean().optional(),
  pepDetails: z.string().max(2000).nullable().optional(),
  sourceOfFunds: z.string().nullable().optional(),
  sourceOfFundsDetail: z.string().max(2000).nullable().optional(),

  // Experience & funding
  experienceLevel: z.string().nullable().optional(),
  timelineToBuy: z.string().nullable().optional(),
  mortgageStatus: z.string().nullable().optional(),
  mortgageLender: z.string().max(100).nullable().optional(),
  maxLtv: z.number().int().min(0).max(100).nullable().optional(),
  depositAvailable: z.number().nonnegative().nullable().optional(),
  referralSource: z.string().max(100).nullable().optional(),
})
  .refine((d) => !d.phone || isValidPhoneNumber(d.phone, 'GB'), {
    path: ['phone'], message: 'Invalid UK phone number',
  })
  .refine((d) => d.budgetMin === undefined || d.budgetMax === undefined || d.budgetMin <= d.budgetMax, {
    path: ['budgetMax'], message: 'budgetMax must be ≥ budgetMin',
  })
  .refine((d) => !d.nationality || VALID_COUNTRY_CODES.includes(d.nationality), {
    path: ['nationality'], message: 'Invalid country code',
  })
  .refine((d) => !d.taxResidency || VALID_COUNTRY_CODES.includes(d.taxResidency), {
    path: ['taxResidency'], message: 'Invalid country code',
  })
  .refine((d) => !d.sourceOfFunds || VALID_SOURCE_OF_FUNDS.includes(d.sourceOfFunds), {
    path: ['sourceOfFunds'], message: 'Invalid source of funds',
  })
  .refine((d) => !d.entityType || VALID_ENTITY_TYPES.has(d.entityType), {
    path: ['entityType'], message: 'Invalid entity type',
  })
  .refine((d) => !d.experienceLevel || VALID_EXPERIENCE.has(d.experienceLevel), {
    path: ['experienceLevel'], message: 'Invalid experience level',
  })
  .refine((d) => !d.timelineToBuy || VALID_TIMELINE.has(d.timelineToBuy), {
    path: ['timelineToBuy'], message: 'Invalid timeline',
  })
  .refine((d) => !d.mortgageStatus || VALID_MORTGAGE_STATUS.has(d.mortgageStatus), {
    path: ['mortgageStatus'], message: 'Invalid mortgage status',
  })
  .refine((d) => {
    if (!d.niNumber) return true
    return NI_NUMBER_REGEX.test(d.niNumber.replace(/\s+/g, ''))
  }, { path: ['niNumber'], message: 'Invalid NI number format (e.g. QQ123456C)' })
  .refine((d) => {
    if (!d.companyNumber || d.entityType !== 'LTD_COMPANY') return true
    return COMPANY_NUMBER_REGEX.test(d.companyNumber.replace(/\s+/g, '').toUpperCase())
  }, { path: ['companyNumber'], message: 'Invalid Companies House number' })
  .refine((d) => {
    if (!d.dateOfBirth) return true
    const dob = new Date(d.dateOfBirth)
    if (Number.isNaN(dob.getTime())) return false
    const age = ageOn(dob)
    return age >= 18 && age <= 120
  }, { path: ['dateOfBirth'], message: 'Date of birth must give an age between 18 and 120' })

export type AdminProfileUpdate = z.infer<typeof adminProfileUpdateSchema>

/**
 * Returns the list of touched fields that fall within AML_CORE_FIELDS.
 * `input` is the validated schema output — only set keys are real updates.
 */
export function touchedAmlFields(input: Record<string, unknown>): string[] {
  return Object.keys(input).filter((k) => AML_CORE_FIELDS.has(k))
}

/**
 * Compute a shallow `{ field: { before, after } }` diff between current and
 * incoming. Only includes fields present in `incoming` whose values differ.
 *
 * Date values are normalised to ISO strings; nulls compare against `null`.
 */
export function computeDiff(
  current: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, { before: unknown; after: unknown }> {
  const diff: Record<string, { before: unknown; after: unknown }> = {}
  for (const key of Object.keys(incoming)) {
    if (key === 'reason') continue
    const before = current[key] instanceof Date
      ? (current[key] as Date).toISOString()
      : current[key] ?? null
    const after = incoming[key] instanceof Date
      ? (incoming[key] as Date).toISOString()
      : incoming[key] ?? null
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      diff[key] = { before, after }
    }
  }
  return diff
}
