import { freeTierDealCutoff, type UserTier } from '@/lib/subscriptions'

/**
 * Returns the Prisma `where` fragment that filters deals by tier-based
 * publication date. PREMIUM members see deals as soon as `publishedAt <= now`;
 * FREE members see them only after a 48-hour preview window has elapsed.
 *
 * Legacy deals (publishedAt = null) are visible to everyone — this preserves
 * historical access for accounts created before Phase 7.4.
 */
export function dealVisibilityWhere(tier: UserTier, now: Date = new Date()) {
  if (tier === 'PREMIUM') {
    return { OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] }
  }
  const cutoff = freeTierDealCutoff(now)
  return { OR: [{ publishedAt: null }, { publishedAt: { lte: cutoff } }] }
}

/**
 * Returns true if a deal with the given publishedAt is visible to a user of
 * the given tier right now.
 */
export function isDealVisible(publishedAt: Date | null, tier: UserTier, now: Date = new Date()): boolean {
  if (publishedAt === null) return true
  if (tier === 'PREMIUM') return publishedAt <= now
  return publishedAt <= freeTierDealCutoff(now)
}
