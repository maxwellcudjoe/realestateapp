// Canonical property-type, tenure, and EPC enums for deal cards (Task 4.3).

export const PROPERTY_TYPES = [
  { value: 'TERRACED',      label: 'Terraced' },
  { value: 'SEMI_DETACHED', label: 'Semi-detached' },
  { value: 'DETACHED',      label: 'Detached' },
  { value: 'FLAT',          label: 'Flat / Apartment' },
  { value: 'BUNGALOW',      label: 'Bungalow' },
  { value: 'COMMERCIAL',    label: 'Commercial' },
  { value: 'OTHER',         label: 'Other' },
] as const

export const TENURE_OPTIONS = [
  { value: 'FREEHOLD',           label: 'Freehold' },
  { value: 'LEASEHOLD',          label: 'Leasehold' },
  { value: 'SHARE_OF_FREEHOLD',  label: 'Share of Freehold' },
] as const

export const EPC_RATINGS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const

export const VALID_PROPERTY_TYPES: Set<string> = new Set(PROPERTY_TYPES.map((t) => t.value))
export const VALID_TENURES: Set<string> = new Set(TENURE_OPTIONS.map((t) => t.value))
export const VALID_EPC_RATINGS: Set<string> = new Set(EPC_RATINGS)

export function propertyTypeLabel(v: string | null | undefined): string {
  if (!v) return '—'
  return PROPERTY_TYPES.find((t) => t.value === v)?.label ?? v
}

export function tenureLabel(v: string | null | undefined): string {
  if (!v) return '—'
  return TENURE_OPTIONS.find((t) => t.value === v)?.label ?? v
}

/** Gross yield = annual rent / asking price × 100. Returns null when inputs are missing. */
export function computeGrossYield(monthlyRent: number | null, askingPrice: number | null): number | null {
  if (!monthlyRent || !askingPrice || askingPrice <= 0) return null
  return (monthlyRent * 12 / askingPrice) * 100
}

/** Colour-ramp class for EPC ratings (Tailwind text classes). */
export function epcRatingColor(rating: string | null | undefined): string {
  switch (rating) {
    case 'A':
    case 'B': return 'text-green-400'
    case 'C': return 'text-lime-400'
    case 'D': return 'text-yellow-400'
    case 'E': return 'text-amber-400'
    case 'F':
    case 'G': return 'text-red-400'
    default:  return 'text-stone'
  }
}
