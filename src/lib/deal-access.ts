import { prisma } from '@/lib/prisma'
import { effectiveTier } from '@/lib/subscriptions'
import { dealVisibilityWhere } from '@/lib/deal-visibility'
import type { Prisma } from '@/generated/prisma/client'

/**
 * Loads a deal scoped to a specific investor's application, with the FREE-tier
 * 48-hour Premium-preview gate enforced server-side. Returns `null` when:
 *   - The deal doesn't exist
 *   - It belongs to a different investor
 *   - The investor's effective tier is FREE and the deal is still inside the
 *     48h preview window (i.e. `publishedAt > now - 48h`)
 *
 * Callers should treat null as a 404 — do not leak whether a hidden deal exists.
 *
 * Use this in every portal subresource route (offer, response, viewings,
 * messages, documents, favourite) so the Premium gate is uniform.
 */
export async function getInvestorDeal<I extends Prisma.DealInclude>(
  dealId: string,
  userId: string,
  options: { include?: I } = {},
): Promise<Prisma.DealGetPayload<{ include: I }> | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tier: true,
      subscription: { select: { cancelledAt: true, nextRenewalAt: true } },
    },
  })
  if (!user) return null

  const tier = effectiveTier(user)
  return prisma.deal.findFirst({
    where: {
      AND: [
        { id: dealId },
        { application: { investorProfile: { userId } } },
        dealVisibilityWhere(tier),
      ],
    },
    ...(options.include ? { include: options.include } : {}),
  }) as unknown as Prisma.DealGetPayload<{ include: I }> | null
}

/**
 * Admin-context loader. No tier or ownership constraint — admins see every deal
 * regardless of Premium gate or which investor it belongs to.
 */
export async function getAdminDeal<I extends Prisma.DealInclude>(
  dealId: string,
  options: { include?: I } = {},
): Promise<Prisma.DealGetPayload<{ include: I }> | null> {
  return prisma.deal.findUnique({
    where: { id: dealId },
    ...(options.include ? { include: options.include } : {}),
  }) as unknown as Prisma.DealGetPayload<{ include: I }> | null
}

/**
 * Role-aware shortcut: admins use {@link getAdminDeal}, investors use
 * {@link getInvestorDeal} (tier-gated). Use this in routes that serve both
 * roles (messages, documents) so the gate is applied consistently.
 */
export async function getDealForViewer<I extends Prisma.DealInclude>(
  dealId: string,
  userId: string,
  role: string,
  options: { include?: I } = {},
): Promise<Prisma.DealGetPayload<{ include: I }> | null> {
  if (role === 'admin') return getAdminDeal(dealId, options)
  return getInvestorDeal(dealId, userId, options)
}
