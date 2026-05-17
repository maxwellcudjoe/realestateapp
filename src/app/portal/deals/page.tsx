import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { DealsClient } from '@/components/portal/DealsClient'
import { dealVisibilityWhere } from '@/lib/deal-visibility'
import type { UserTier } from '@/lib/subscriptions'

export const dynamic = 'force-dynamic'

export default async function PortalDealsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const baseUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tier: true },
  })
  const tier = (baseUser?.tier ?? 'FREE') as UserTier

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      investorProfile: {
        include: {
          application: {
            include: {
              deals: {
                where: dealVisibilityWhere(tier),
                orderBy: { createdAt: 'desc' },
                include: { response: true, favourites: { where: { userId: session.user.id }, select: { id: true } } },
              },
            },
          },
        },
      },
    },
  })

  if (!user?.investorProfile?.application) {
    return <p className="font-sans text-sm text-stone">No application found.</p>
  }

  // Count hidden deals (PREMIUM-only previews) to show the upgrade nudge for FREE users
  let hiddenPremiumPreviewCount = 0
  if (tier !== 'PREMIUM') {
    hiddenPremiumPreviewCount = await prisma.deal.count({
      where: {
        applicationId: user.investorProfile.application.id,
        publishedAt: { gt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
    })
  }

  const deals = user.investorProfile.application.deals.map((d) => ({
    id: d.id,
    title: d.title,
    address: d.address,
    askingPrice: Number(d.askingPrice),
    summary: d.summary,
    status: d.status,
    stage: d.stage,
    createdAt: d.createdAt.toISOString(),
    bedrooms: d.bedrooms,
    bathrooms: d.bathrooms,
    propertyType: d.propertyType,
    tenure: d.tenure,
    epcRating: d.epcRating,
    rentalAppraisalMonthly: d.rentalAppraisalMonthly ? Number(d.rentalAppraisalMonthly) : null,
    floorAreaSqft: d.floorAreaSqft,
    favourited: d.favourites.length > 0,
    response: d.response
      ? {
          id: d.response.id,
          intent: d.response.intent,
          comment: d.response.comment,
          createdAt: d.response.createdAt.toISOString(),
          updatedAt: d.response.updatedAt.toISOString(),
        }
      : null,
  }))

  return (
    <div>
      <h1 className="font-serif text-4xl font-light text-ivory mb-2">Deals</h1>
      <p className="font-sans text-sm text-stone mb-8">
        Property deals matched to your investment criteria. Respond to let us know your interest.
      </p>
      {hiddenPremiumPreviewCount > 0 && (
        <div className="mb-8 border border-gold/60 bg-gold/5 p-4">
          <p className="font-sans text-xs text-ivory">
            <strong>{hiddenPremiumPreviewCount}</strong> new deal{hiddenPremiumPreviewCount === 1 ? '' : 's'} available now to Premium members —
            you&rsquo;ll see {hiddenPremiumPreviewCount === 1 ? 'it' : 'them'} within 48 hours.{' '}
            <a href="/portal/subscription" className="text-gold hover:underline">Upgrade for instant access →</a>
          </p>
        </div>
      )}
      <DealsClient deals={deals} />
    </div>
  )
}
