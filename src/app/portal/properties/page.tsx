import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { propertyTypeLabel } from '@/lib/property'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`

const TENANCY_LABEL: Record<string, string> = {
  VACANT: 'Vacant',
  TENANTED: 'Tenanted',
  OWN_USE: 'Own use',
}

export default async function PortalPropertiesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const properties = await prisma.property.findMany({
    where: { userId: session.user.id },
    orderBy: { completionDate: 'desc' },
    include: { _count: { select: { documents: true } } },
  })

  // Portfolio metrics (Task 5.3)
  const totalInvested = properties.reduce((s, p) => s + Number(p.purchasePrice), 0)
  const totalCurrentValue = properties.reduce((s, p) => s + Number(p.currentValueEstimate ?? p.purchasePrice), 0)
  const totalMonthlyRent = properties.reduce((s, p) => s + Number(p.monthlyRent ?? 0), 0)
  const annualRent = totalMonthlyRent * 12
  const portfolioYield = totalCurrentValue > 0 ? (annualRent / totalCurrentValue) * 100 : 0
  const tenantedCount = properties.filter((p) => p.tenancyStatus === 'TENANTED').length
  const occupancy = properties.length > 0 ? (tenantedCount / properties.length) * 100 : 0

  return (
    <div>
      <h1 className="font-serif text-4xl font-light text-ivory mb-2">My Properties</h1>
      <p className="font-sans text-sm text-stone mb-10">
        Properties auto-appear here when a deal completes. Update values and tenancy details to keep your portfolio metrics live.
      </p>

      {properties.length === 0 ? (
        <div className="border border-carbon p-8 text-center">
          <p className="font-sans text-sm text-stone">
            You don&apos;t have any completed properties yet. Once a deal moves to <span className="text-gold">Completed</span>, it will appear here automatically.
          </p>
        </div>
      ) : (
        <>
          {/* Portfolio metrics */}
          <section className="mb-12">
            <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Portfolio Overview</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-carbon border border-carbon">
              {[
                ['Properties', String(properties.length)],
                ['Total invested', fmt(totalInvested)],
                ['Current value', fmt(totalCurrentValue)],
                ['Monthly rent', fmt(totalMonthlyRent)],
                ['Gross yield', `${portfolioYield.toFixed(1)}%`],
              ].map(([label, value]) => (
                <div key={label} className="bg-obsidian p-5">
                  <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">{label}</p>
                  <p className="font-serif text-xl text-ivory">{value}</p>
                </div>
              ))}
            </div>
            {properties.length > 0 && (
              <p className="font-sans text-[0.6rem] text-stone mt-2">
                Occupancy: {occupancy.toFixed(0)}% ({tenantedCount} of {properties.length} tenanted)
              </p>
            )}
          </section>

          {/* Property list */}
          <section>
            <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Holdings</p>
            <ul className="space-y-3">
              {properties.map((p) => {
                const currentValue = Number(p.currentValueEstimate ?? p.purchasePrice)
                const equity = currentValue - Number(p.purchasePrice)
                const equityPct = Number(p.purchasePrice) > 0 ? (equity / Number(p.purchasePrice)) * 100 : 0
                return (
                  <li key={p.id}>
                    <Link href={`/portal/properties/${p.id}`} className="block border border-carbon hover:border-gold/40 transition-colors p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <p className="font-sans text-sm text-ivory">{p.address}</p>
                          <p className="font-sans text-[0.6rem] uppercase tracking-widest text-stone mt-1">
                            {propertyTypeLabel(p.propertyType)}
                            {p.bedrooms != null && ` · ${p.bedrooms}-bed`}
                            {' · '}Completed {p.completionDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {' · '}{p._count.documents} doc{p._count.documents === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Value</p>
                          <p className="font-sans text-base text-gold">{fmt(currentValue)}</p>
                          {equity !== 0 && (
                            <p className={`font-sans text-[0.6rem] ${equity > 0 ? 'text-gold' : 'text-red-400'}`}>
                              {equity > 0 ? '+' : ''}{fmt(equity)} ({equityPct.toFixed(1)}%)
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-3 flex-wrap">
                        <span className={`font-sans text-[0.55rem] uppercase tracking-widest px-2 py-0.5 border ${p.tenancyStatus === 'TENANTED' ? 'text-gold border-gold/30 bg-gold/5' : 'text-stone border-carbon'}`}>
                          {TENANCY_LABEL[p.tenancyStatus] ?? p.tenancyStatus}
                        </span>
                        {p.monthlyRent != null && (
                          <span className="font-sans text-xs text-stone">{fmt(Number(p.monthlyRent))}/mo</span>
                        )}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
