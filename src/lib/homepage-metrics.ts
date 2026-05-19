import { prisma } from '@/lib/prisma'

export interface HomepageMetrics {
  totalDealsYtd: number
  totalActiveInvestors: number
  totalCompletedValue: number   // GBP, completed Property purchasePrice sum
  totalCompletedCount: number
  avgBmvPercent: number | null  // null when no BMV data is captured
}

/**
 * Build the homepage trust strip stats from live data. Falls back to safe
 * zero values on any error — the homepage should never crash on a stats query.
 *
 * Caches at the Next.js route level via `revalidate` on the page; this
 * function itself doesn't memoise.
 */
export async function getHomepageMetrics(now: Date = new Date()): Promise<HomepageMetrics> {
  try {
    const ytdStart = new Date(now.getFullYear(), 0, 1)

    const [dealsYtd, activeInvestors, completed] = await Promise.all([
      prisma.deal.count({
        where: { publishedAt: { gte: ytdStart } },
      }),
      prisma.user.count({
        where: {
          role: 'investor',
          deletedAt: null,
          emailVerifiedAt: { not: null },
        },
      }),
      prisma.property.findMany({
        select: { purchasePrice: true },
      }),
    ])

    const totalCompletedValue = completed.reduce((sum, p) => sum + Number(p.purchasePrice), 0)
    const totalCompletedCount = completed.length

    // BMV is computed at deal-publish time on Contentful, not on Deal — so
    // we don't have a reliable column to average. Return null and let the UI
    // hide the chip when null.
    return {
      totalDealsYtd: dealsYtd,
      totalActiveInvestors: activeInvestors,
      totalCompletedValue,
      totalCompletedCount,
      avgBmvPercent: null,
    }
  } catch (e) {
    console.error('[homepage-metrics] failed (non-fatal):', e)
    return {
      totalDealsYtd: 0,
      totalActiveInvestors: 0,
      totalCompletedValue: 0,
      totalCompletedCount: 0,
      avgBmvPercent: null,
    }
  }
}

/**
 * Round a number down to a "credibly precise" round number for display.
 * 1247 -> "1,200+", 12.4M -> "£12M+". When the underlying number is very
 * small (single digits) we show the exact value.
 */
export function formatTrustNumber(n: number): string {
  if (n < 10) return String(n)
  if (n < 100) return `${Math.floor(n / 10) * 10}+`
  if (n < 1_000) return `${Math.floor(n / 50) * 50}+`
  if (n < 10_000) return `${Math.floor(n / 100) * 100}+`
  if (n < 1_000_000) return `${Math.floor(n / 1_000)}k+`
  return `${Math.floor(n / 1_000_000)}M+`
}

export function formatTrustGbp(n: number): string {
  if (n < 1_000) return `£${n}`
  if (n < 1_000_000) return `£${Math.floor(n / 1_000)}k+`
  if (n < 1_000_000_000) {
    const millions = n / 1_000_000
    return millions >= 10 ? `£${Math.floor(millions)}M+` : `£${millions.toFixed(1)}M+`
  }
  return `£${(n / 1_000_000_000).toFixed(1)}B+`
}
