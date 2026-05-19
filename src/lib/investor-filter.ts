export interface InvestorRow {
  status: string
  tier: string
  isPep: boolean
  entityType: string
  complianceCompleted: boolean
  kycExpiresAt: string | null
  deletedAt: string | null
  name: string
  email: string
}

export interface InvestorFilters {
  status: string
  search: string
  tier: string
  pep: string
  compliance: string
  kycExpiring: string
  entityType: string
  showDeleted: boolean
}

export const KYC_WARN_MS = 30 * 24 * 60 * 60 * 1000

export const DEFAULT_FILTERS: InvestorFilters = {
  status: 'ALL',
  search: '',
  tier: 'ALL',
  pep: 'ALL',
  compliance: 'ALL',
  kycExpiring: 'ALL',
  entityType: 'ALL',
  showDeleted: false,
}

export function filterInvestors<T extends InvestorRow>(
  investors: T[],
  filters: InvestorFilters,
  now: number = Date.now(),
): T[] {
  return investors.filter((inv) => {
    if (!filters.showDeleted && inv.deletedAt) return false
    if (filters.status !== 'ALL' && inv.status !== filters.status) return false
    if (filters.tier !== 'ALL' && inv.tier !== filters.tier) return false
    if (filters.pep !== 'ALL') {
      if (filters.pep === 'YES' && !inv.isPep) return false
      if (filters.pep === 'NO' && inv.isPep) return false
    }
    if (filters.compliance !== 'ALL') {
      if (filters.compliance === 'COMPLETE' && !inv.complianceCompleted) return false
      if (filters.compliance === 'INCOMPLETE' && inv.complianceCompleted) return false
    }
    if (filters.kycExpiring === 'YES') {
      if (!inv.kycExpiresAt) return false
      const expiresMs = Date.parse(inv.kycExpiresAt)
      if (Number.isNaN(expiresMs)) return false
      if (expiresMs - now > KYC_WARN_MS) return false
    }
    if (filters.entityType !== 'ALL' && inv.entityType !== filters.entityType) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!inv.name.toLowerCase().includes(q) && !inv.email.toLowerCase().includes(q)) return false
    }
    return true
  })
}

export function isKycExpiringSoon(kycExpiresAt: string | null, now: number = Date.now()): boolean {
  if (!kycExpiresAt) return false
  const expiresMs = Date.parse(kycExpiresAt)
  return !Number.isNaN(expiresMs) && expiresMs - now <= KYC_WARN_MS
}
