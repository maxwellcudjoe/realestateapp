// Canonical investor strategies. Codes are stable DB values; labels are display-only.
// Note: legacy "Any" / "All" values from earlier schemas are NOT included — multi-select
// of all 5 strategies expresses the same intent.

export const STRATEGIES = [
  { code: 'BTL', label: 'Buy To Let (BTL)', description: 'Long-term rental to a single household' },
  { code: 'HMO', label: 'HMO (House in Multiple Occupation)', description: 'Multi-tenant rental, higher yield' },
  { code: 'FLIP', label: 'Flip', description: 'Buy, refurbish, sell on' },
  { code: 'COMMERCIAL', label: 'Commercial', description: 'Offices, retail, industrial' },
  { code: 'SERVICED_ACCOM', label: 'Serviced Accommodation', description: 'Short-stay / Airbnb-style' },
] as const

export const VALID_STRATEGY_CODES: Set<string> = new Set(STRATEGIES.map((s) => s.code))

export function strategyLabel(code: string): string {
  return STRATEGIES.find((s) => s.code === code)?.label ?? code
}

/** Map a legacy single-strategy string from older accounts to the new codes. */
export function legacyToStrategies(legacy: string | null | undefined): string[] {
  if (!legacy) return []
  const v = legacy.toUpperCase()
  if (v === 'ANY' || v === 'ALL') return STRATEGIES.map((s) => s.code)
  if (v === 'BTL') return ['BTL']
  if (v === 'HMO') return ['HMO']
  if (v === 'FLIP') return ['FLIP']
  if (v === 'COMMERCIAL') return ['COMMERCIAL']
  if (v === 'SERVICED_ACCOM' || v === 'SA') return ['SERVICED_ACCOM']
  return []
}
