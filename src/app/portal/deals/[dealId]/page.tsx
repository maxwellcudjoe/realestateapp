import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { dealStageLabel, dealStageDescription, visibleStagesForTimeline } from '@/lib/deal-stages'
import { OfferForm } from '@/components/portal/OfferForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PortalDealDetailPage({ params }: { params: { dealId: string } }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // getDealForUser pattern — ensure the deal belongs to this investor
  const deal = await prisma.deal.findFirst({
    where: { id: params.dealId, application: { investorProfile: { userId: session.user.id } } },
    include: {
      stageHistory: { orderBy: { createdAt: 'asc' } },
      dealLeadUser: { select: { email: true } },
      response: true,
      offer: true,
    },
  })
  if (!deal) redirect('/portal/deals')

  const fmt = (n: number) => `£${Number(n).toLocaleString('en-GB')}`
  const timeline = visibleStagesForTimeline(deal.stage)
  const historyByStage = new Map(deal.stageHistory.map((h) => [h.toStage, h]))

  return (
    <div>
      <Link href="/portal/deals" className="font-sans text-xs uppercase tracking-widest text-stone hover:text-gold transition-colors mb-4 inline-block">
        ← All deals
      </Link>
      <h1 className="font-serif text-3xl font-light text-ivory mb-2">{deal.title}</h1>
      <p className="font-sans text-sm text-stone mb-1">{deal.address}</p>
      <p className="font-sans text-sm text-gold mb-8">{fmt(Number(deal.askingPrice))}</p>

      <section className="mb-12">
        <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Current Stage</p>
        <div className="border border-gold p-5 bg-gold/5">
          <p className="font-sans text-lg text-ivory">{dealStageLabel(deal.stage)}</p>
          <p className="font-sans text-xs text-stone mt-1">{dealStageDescription(deal.stage)}</p>
        </div>
      </section>

      {deal.response?.intent === 'ACCEPT' && (
        <section className="mb-12">
          <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Your Offer</p>
          <div className="border border-carbon p-5">
            <OfferForm
              dealId={deal.id}
              askingPrice={Number(deal.askingPrice)}
              existingOffer={deal.offer ? {
                amount: Number(deal.offer.amount),
                depositPercent: deal.offer.depositPercent,
                financingSource: deal.offer.financingSource,
                targetExchangeDate: deal.offer.targetExchangeDate?.toISOString() ?? null,
                conditions: deal.offer.conditions,
                status: deal.offer.status,
                vendorDecisionNote: deal.offer.vendorDecisionNote,
                submittedAt: deal.offer.submittedAt.toISOString(),
              } : null}
            />
          </div>
        </section>
      )}

      <section className="mb-12">
        <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Pipeline</p>
        <ol className="space-y-3">
          {timeline.map((s) => {
            const isCurrent = s.value === deal.stage
            const historyEntry = historyByStage.get(s.value)
            const isPast = Boolean(historyEntry) && !isCurrent
            return (
              <li key={s.value} className={`border-l-2 pl-4 py-1 ${isCurrent ? 'border-gold' : isPast ? 'border-gold/40' : 'border-carbon'}`}>
                <p className={`font-sans text-sm ${isCurrent ? 'text-gold' : isPast ? 'text-ivory' : 'text-stone'}`}>
                  {s.label}
                </p>
                {historyEntry && (
                  <p className="font-sans text-[0.6rem] text-stone mt-0.5">
                    {historyEntry.createdAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {historyEntry.note && <span className="block italic text-stone/80 mt-1 leading-relaxed">&ldquo;{historyEntry.note}&rdquo;</span>}
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      {(deal.dealLeadUser || deal.solicitorContact || deal.brokerContact) && (
        <section className="mb-12">
          <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Your Deal Team</p>
          <div className="border border-carbon p-5 space-y-4">
            {deal.dealLeadUser && (
              <div>
                <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Lead Contact</p>
                <p className="font-sans text-sm text-ivory">{deal.dealLeadUser.email}</p>
              </div>
            )}
            {deal.solicitorContact && (
              <div>
                <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Solicitor</p>
                <p className="font-sans text-sm text-ivory whitespace-pre-line">{deal.solicitorContact}</p>
              </div>
            )}
            {deal.brokerContact && (
              <div>
                <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Mortgage Broker</p>
                <p className="font-sans text-sm text-ivory whitespace-pre-line">{deal.brokerContact}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {deal.summary && (
        <section>
          <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Original Deal Summary</p>
          <p className="font-sans text-sm text-stone leading-relaxed border-l-2 border-carbon pl-4 italic">
            {deal.summary}
          </p>
        </section>
      )}
    </div>
  )
}
