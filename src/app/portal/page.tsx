import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { dealStageLabel } from '@/lib/deal-stages'
import { WelcomeBanner } from '@/components/portal/WelcomeBanner'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED:           'Application Submitted',
  UNDER_REVIEW:        'Under Review',
  DOCUMENTS_REQUESTED: 'Documents Requested',
  DOCUMENTS_RECEIVED:  'Documents Received',
  KYC_APPROVED:        'KYC Approved',
  ACTIVE_INVESTOR:     'Active Investor',
  DEAL_SENT:           'Deal Sent',
}

const fmt = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`

export default async function PortalOverviewPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      investorProfile: {
        select: {
          firstName: true,
          application: {
            select: {
              id: true,
              status: true,
              deals: {
                orderBy: { createdAt: 'desc' },
                take: 3,
                select: { id: true, title: true, address: true, stage: true, askingPrice: true, response: { select: { intent: true } } },
              },
              _count: { select: { deals: true, messages: true } },
            },
          },
        },
      },
    },
  })

  if (!user?.investorProfile?.application) {
    return <p className="font-sans text-sm text-stone">No application found.</p>
  }

  const app = user.investorProfile.application
  const recentDeals = app.deals
  const openDealCount = app.deals.length // top 3 in include; below we'll use _count for total
  const totalDeals = app._count.deals
  const totalMessages = app._count.messages

  const propertyAgg = await prisma.property.aggregate({
    where: { userId: session.user.id },
    _count: { _all: true },
    _sum: { currentValueEstimate: true, monthlyRent: true, purchasePrice: true },
  })

  const propertyCount = propertyAgg._count._all
  const totalValue = Number(propertyAgg._sum.currentValueEstimate ?? propertyAgg._sum.purchasePrice ?? 0)
  const totalMonthlyRent = Number(propertyAgg._sum.monthlyRent ?? 0)

  return (
    <div>
      <WelcomeBanner />
      <h1 className="font-serif text-4xl font-light text-ivory mb-2">
        Welcome, {user.investorProfile.firstName}
      </h1>
      <p className="font-sans text-sm text-stone mb-10">Your investor portal at a glance.</p>

      {/* Top metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-carbon border border-carbon mb-12">
        <Link href="/portal/status" className="bg-obsidian p-5 hover:bg-charcoal transition-colors block">
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">KYC Stage</p>
          <p className="font-serif text-lg text-ivory">{STATUS_LABEL[app.status] ?? app.status}</p>
          <p className="font-sans text-[0.6rem] text-gold mt-2">View timeline →</p>
        </Link>
        <Link href="/portal/deals" className="bg-obsidian p-5 hover:bg-charcoal transition-colors block">
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">Active Deals</p>
          <p className="font-serif text-3xl text-ivory">{totalDeals}</p>
          <p className="font-sans text-[0.6rem] text-gold mt-2">{totalDeals === 0 ? 'None yet' : `Open ${openDealCount} →`}</p>
        </Link>
        <Link href="/portal/properties" className="bg-obsidian p-5 hover:bg-charcoal transition-colors block">
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">Portfolio</p>
          <p className="font-serif text-lg text-ivory">{propertyCount} {propertyCount === 1 ? 'property' : 'properties'}</p>
          <p className="font-sans text-[0.6rem] text-gold mt-2">
            {propertyCount > 0 ? `${fmt(totalValue)} · ${fmt(totalMonthlyRent)}/mo` : 'No completed properties yet'}
          </p>
        </Link>
        <Link href="/portal/messages" className="bg-obsidian p-5 hover:bg-charcoal transition-colors block">
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">Messages</p>
          <p className="font-serif text-3xl text-ivory">{totalMessages}</p>
          <p className="font-sans text-[0.6rem] text-gold mt-2">Open inbox →</p>
        </Link>
      </div>

      {/* Recent deals */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">Recent Deals</p>
          <Link href="/portal/deals" className="font-sans text-[0.6rem] uppercase tracking-widest text-stone hover:text-gold transition-colors">View all →</Link>
        </div>
        {recentDeals.length === 0 ? (
          <div className="border border-carbon p-6">
            <p className="font-sans text-sm text-stone">
              You haven&apos;t received any deals yet. Once your application is activated, deals matching your criteria will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {recentDeals.map((d) => (
              <li key={d.id}>
                <Link href={`/portal/deals/${d.id}`} className="block border border-carbon p-4 hover:border-gold/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-sans text-sm text-ivory">{d.title}</p>
                      <p className="font-sans text-xs text-stone mt-0.5">{d.address}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-sans text-sm text-gold">{fmt(Number(d.askingPrice))}</p>
                      <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mt-0.5">
                        {dealStageLabel(d.stage)}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quick links */}
      <section>
        <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Quick Actions</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/portal/profile" className="px-5 py-2.5 border border-carbon text-stone hover:border-gold hover:text-gold transition-colors font-sans text-[0.65rem] uppercase tracking-widest">
            Update profile
          </Link>
          <Link href="/portal/security" className="px-5 py-2.5 border border-carbon text-stone hover:border-gold hover:text-gold transition-colors font-sans text-[0.65rem] uppercase tracking-widest">
            Manage 2FA &amp; password
          </Link>
          <Link href="/portal/messages" className="px-5 py-2.5 border border-carbon text-stone hover:border-gold hover:text-gold transition-colors font-sans text-[0.65rem] uppercase tracking-widest">
            Message the team
          </Link>
        </div>
      </section>
    </div>
  )
}
