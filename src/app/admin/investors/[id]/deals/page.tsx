import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { AdminPostDealForm } from '@/components/admin/AdminPostDealForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const INTENT_DISPLAY: Record<string, string> = {
  ACCEPT: 'Accepted',
  MORE_INFO: 'More Info',
  PASS: 'Passed',
}

export default async function AdminInvestorDealsPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const app = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      investorProfile: { select: { firstName: true, lastName: true } },
      deals: {
        orderBy: { createdAt: 'desc' },
        include: { response: true },
      },
    },
  })

  if (!app) redirect('/admin/investors')

  const fmt = (n: number) => `£${n.toLocaleString('en-GB')}`
  const p = app.investorProfile

  return (
    <div>
      <Link
        href={`/admin/investors/${params.id}`}
        className="font-sans text-xs uppercase tracking-widest text-stone hover:text-gold transition-colors mb-4 inline-block"
      >
        ← Back to {p.firstName} {p.lastName}
      </Link>
      <h1 className="font-serif text-4xl font-light text-ivory mb-8">
        Deals — {p.firstName} {p.lastName}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Post Deal form */}
        <div>
          <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-6">Post a Deal</h2>
          <AdminPostDealForm applicationId={params.id} />
        </div>

        {/* Posted deals list */}
        <div>
          <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-6">
            Posted Deals ({app.deals.length})
          </h2>
          {app.deals.length === 0 ? (
            <p className="font-sans text-xs text-stone">No deals posted yet.</p>
          ) : (
            <div className="space-y-4">
              {app.deals.map((deal) => (
                <div key={deal.id} className="border border-carbon p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-sans text-sm font-medium text-ivory">{deal.title}</p>
                      <p className="font-sans text-xs text-stone mt-0.5">{deal.address}</p>
                      <p className="font-sans text-xs text-gold mt-1">{fmt(Number(deal.askingPrice))}</p>
                    </div>
                    <div
                      className={`flex-shrink-0 px-2 py-1 font-sans text-[0.55rem] uppercase tracking-widest border ${
                        deal.response
                          ? deal.response.intent === 'ACCEPT'
                            ? 'text-gold border-gold/30 bg-gold/5'
                            : deal.response.intent === 'MORE_INFO'
                            ? 'text-ivory border-carbon'
                            : 'text-stone border-carbon'
                          : 'text-stone/60 border-carbon/50'
                      }`}
                    >
                      {deal.response ? INTENT_DISPLAY[deal.response.intent] : 'Awaiting'}
                    </div>
                  </div>
                  {deal.response?.comment && (
                    <p className="font-sans text-xs text-stone italic border-l-2 border-gold/30 pl-3">
                      &ldquo;{deal.response.comment}&rdquo;
                    </p>
                  )}
                  <p className="font-sans text-[0.55rem] text-stone/50">
                    Posted {new Date(deal.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {deal.response && (
                      <> · Responded {new Date(deal.response.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
