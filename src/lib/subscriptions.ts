export const BILLING_PERIODS = ['MONTHLY', 'ANNUAL'] as const
export type BillingPeriod = (typeof BILLING_PERIODS)[number]

export const USER_TIERS = ['FREE', 'PREMIUM'] as const
export type UserTier = (typeof USER_TIERS)[number]

/** How long PREMIUM tier members see a deal before FREE tier members do. */
export const PREMIUM_PREVIEW_HOURS = 48

/** Default monthly premium price (env override: REVE_BATIR_PREMIUM_MONTHLY). */
export function premiumMonthlyAmount(): number {
  const raw = process.env.REVE_BATIR_PREMIUM_MONTHLY
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : 49
}

/** Default annual premium price (env override: REVE_BATIR_PREMIUM_ANNUAL). */
export function premiumAnnualAmount(): number {
  const raw = process.env.REVE_BATIR_PREMIUM_ANNUAL
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : 499
}

export function defaultAmountFor(period: BillingPeriod): number {
  return period === 'ANNUAL' ? premiumAnnualAmount() : premiumMonthlyAmount()
}

/** Adds 1 month or 1 year to a date depending on billing period. */
export function nextRenewalDate(from: Date, period: BillingPeriod): Date {
  const next = new Date(from)
  if (period === 'ANNUAL') next.setFullYear(next.getFullYear() + 1)
  else next.setMonth(next.getMonth() + 1)
  return next
}

/**
 * Returns the cutoff date for FREE-tier deal visibility: deals with
 * publishedAt > cutoff are PREMIUM-only.
 */
export function freeTierDealCutoff(now: Date = new Date()): Date {
  const cutoff = new Date(now)
  cutoff.setHours(cutoff.getHours() - PREMIUM_PREVIEW_HOURS)
  return cutoff
}

export const TIER_LABEL: Record<UserTier, string> = {
  FREE: 'Free',
  PREMIUM: 'Premium',
}

export const BILLING_PERIOD_LABEL: Record<BillingPeriod, string> = {
  MONTHLY: 'Monthly',
  ANNUAL: 'Annual',
}
