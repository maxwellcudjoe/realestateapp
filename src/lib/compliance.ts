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
