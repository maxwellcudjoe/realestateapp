// Shared constants for the Task 1.4 AML / compliance step.

/** Common-first country list (ISO 3166-1 alpha-2). Full coverage is overkill for a
 *  UK-property platform — these cover ~95% of likely investors. "OTHER" requires admin follow-up. */
export const COUNTRIES = [
  { code: 'GB', label: 'United Kingdom' },
  { code: 'IE', label: 'Ireland' },
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'FR', label: 'France' },
  { code: 'DE', label: 'Germany' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'ES', label: 'Spain' },
  { code: 'IT', label: 'Italy' },
  { code: 'PT', label: 'Portugal' },
  { code: 'BE', label: 'Belgium' },
  { code: 'CH', label: 'Switzerland' },
  { code: 'SE', label: 'Sweden' },
  { code: 'NO', label: 'Norway' },
  { code: 'DK', label: 'Denmark' },
  { code: 'FI', label: 'Finland' },
  { code: 'PL', label: 'Poland' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'SG', label: 'Singapore' },
  { code: 'HK', label: 'Hong Kong' },
  { code: 'JP', label: 'Japan' },
  { code: 'IN', label: 'India' },
  { code: 'ZA', label: 'South Africa' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'BR', label: 'Brazil' },
  { code: 'MX', label: 'Mexico' },
  { code: 'OT', label: 'Other (please contact us)' },
] as const

export const VALID_COUNTRY_CODES = COUNTRIES.map((c) => c.code) as readonly string[]

export const SOURCE_OF_FUNDS_OPTIONS = [
  { value: 'SAVINGS', label: 'Personal savings' },
  { value: 'PROPERTY_SALE', label: 'Sale of property' },
  { value: 'INHERITANCE', label: 'Inheritance' },
  { value: 'GIFT', label: 'Gift from family' },
  { value: 'BUSINESS_PROFITS', label: 'Business profits / dividends' },
  { value: 'INVESTMENT_RETURNS', label: 'Investment returns' },
  { value: 'PENSION', label: 'Pension / retirement funds' },
  { value: 'OTHER', label: 'Other' },
] as const

export const VALID_SOURCE_OF_FUNDS = SOURCE_OF_FUNDS_OPTIONS.map((o) => o.value) as readonly string[]

/** UK National Insurance number — letters + digits in QQ123456C format (loose). */
export const NI_NUMBER_REGEX = /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/i

export function looksLikeNiNumber(s: string): boolean {
  return NI_NUMBER_REGEX.test(s.replace(/\s+/g, ''))
}

/** Returns age in years for a given DOB on a given reference date. */
export function ageOn(dob: Date, on: Date = new Date()): number {
  let age = on.getFullYear() - dob.getFullYear()
  const m = on.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && on.getDate() < dob.getDate())) age--
  return age
}

// Task 2.4 — Experience / timeline / mortgage / referral
export const EXPERIENCE_LEVELS = [
  { value: 'FIRST_TIME', label: 'First-time investor' },
  { value: 'OWN_1_3', label: 'Own 1–3 properties' },
  { value: 'OWN_4_10', label: 'Own 4–10 properties' },
  { value: 'OWN_10_PLUS', label: 'Own 10+ properties' },
] as const

export const TIMELINE_OPTIONS = [
  { value: 'IMMEDIATE', label: 'Ready to buy immediately' },
  { value: 'M_1_3', label: 'Within 1–3 months' },
  { value: 'M_3_6', label: 'Within 3–6 months' },
  { value: 'M_6_PLUS', label: '6+ months' },
  { value: 'EXPLORING', label: 'Just exploring' },
] as const

export const MORTGAGE_STATUS_OPTIONS = [
  { value: 'NONE', label: 'No mortgage application yet' },
  { value: 'AIP', label: 'Agreement in Principle (AIP)' },
  { value: 'FULL_OFFER', label: 'Full mortgage offer in hand' },
] as const

export const VALID_EXPERIENCE = new Set(EXPERIENCE_LEVELS.map((e) => e.value)) as Set<string>
export const VALID_TIMELINE = new Set(TIMELINE_OPTIONS.map((t) => t.value)) as Set<string>
export const VALID_MORTGAGE_STATUS = new Set(MORTGAGE_STATUS_OPTIONS.map((m) => m.value)) as Set<string>

export function experienceLabel(v: string | null): string {
  if (!v) return '—'
  return EXPERIENCE_LEVELS.find((e) => e.value === v)?.label ?? v
}
export function timelineLabel(v: string | null): string {
  if (!v) return '—'
  return TIMELINE_OPTIONS.find((t) => t.value === v)?.label ?? v
}
export function mortgageStatusLabel(v: string | null): string {
  if (!v) return '—'
  return MORTGAGE_STATUS_OPTIONS.find((m) => m.value === v)?.label ?? v
}

// Task 2.3 — Buyer entity types
export const ENTITY_TYPES = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'LTD_COMPANY', label: 'Limited Company (Ltd / SPV)' },
  { value: 'LLP', label: 'LLP (Limited Liability Partnership)' },
  { value: 'TRUST', label: 'Trust' },
] as const

export const VALID_ENTITY_TYPES: Set<string> = new Set(ENTITY_TYPES.map((e) => e.value))

export function entityTypeLabel(v: string | null | undefined): string {
  if (!v) return 'Individual'
  return ENTITY_TYPES.find((e) => e.value === v)?.label ?? v
}

/** UK Companies House number: 8 chars — 8 digits, OR 2 letters + 6 digits (e.g. SC123456, NI123456). */
export const COMPANY_NUMBER_REGEX = /^([0-9]{8}|[A-Z]{2}[0-9]{6})$/

export function looksLikeCompanyNumber(s: string): boolean {
  return COMPANY_NUMBER_REGEX.test(s.replace(/\s+/g, '').toUpperCase())
}
