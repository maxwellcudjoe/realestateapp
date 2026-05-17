import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { DealStagePanel } from '@/components/admin/DealStagePanel'
import { OfferDecisionPanel } from '@/components/admin/OfferDecisionPanel'
import { DEAL_STAGES } from '@/lib/deal-stages'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const INTENT_LABEL: Record<string, string> = {
  ACCEPT: "Interested — let's proceed",
  MORE_INFO: 'Interested — need more info',
  PASS: 'Not interested — passing',
}

export default async function AdminDealDetailPage({ params }: { params: { id: string; dealId: string } }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const [deal, admins] = await Promise.all([
    prisma.deal.findUnique({
      where: { id: params.dealId },
      include: {
        application: { include: { investorProfile: { include: { user: { select: { email: true } } } } } },
        response: true,
        stageHistory: { orderBy: { createdAt: 'asc' } },
        dealLeadUser: { select: { id: true, email: true } },
        offer: true,
      },
    }),
    prisma.user.findMany({ where: { role: 'admin' }, select: { id: true, email: true }, orderBy: { email: 'asc' } }),
  ])
  if (!deal || deal.applicationId !== params.id) redirect(`/admin/investors/${params.id}/deals`)

  const fmt = (n: number) => `£${Number(n).toLocaleString('en-GB')}`

  return (
    <div className="min-h-screen bg-obsidian pt-[72px]">
      <div className="max-w-6xl mx-auto px-8 py-12">
        <Link href={`/admin/investors/${params.id}/deals`} className="font-sans text-xs uppercase tracking-widest text-stone hover:text-gold transition-colors mb-4 inline-block">
          ← All deals for this investor
        </Link>
        <h1 className="font-serif text-4xl font-light text-ivory mb-2">{deal.title}</h1>
        <p className="font-sans text-sm text-stone mb-1">{deal.address}</p>
        <p className="font-sans text-sm text-gold mb-8">{fmt(Number(deal.askingPrice))}</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stage timeline */}
          <div className="lg:col-span-2 border border-carbon p-6 space-y-6">
            <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">Pipeline Timeline</h2>
            <ol className="space-y-3">
              {DEAL_STAGES.filter((s) => s.value !== 'FALLEN_THROUGH' || deal.stage === 'FALLEN_THROUGH').map((s) => {
                const isCurrent = s.value === deal.stage
                const historyEntry = deal.stageHistory.find((h) => h.toStage === s.value)
                const isPast = Boolean(historyEntry) && !isCurrent
                return (
                  <li key={s.value} className={`flex gap-4 items-start border-l-2 pl-4 py-1 ${isCurrent ? 'border-gold' : isPast ? 'border-gold/40' : 'border-carbon'}`}>
                    <div className="flex-1">
                      <p className={`font-sans text-sm ${isCurrent ? 'text-gold' : isPast ? 'text-ivory' : 'text-stone'}`}>
                        {s.label}{isCurrent && ' (current)'}
                      </p>
                      {historyEntry && (
                        <p className="font-sans text-[0.6rem] text-stone mt-0.5">
                          {historyEntry.createdAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {historyEntry.note && <span className="block italic text-stone/80 mt-1">&ldquo;{historyEntry.note}&rdquo;</span>}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>

            <div className="border-t border-carbon pt-5">
              <h3 className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-3">Investor</h3>
              <p className="font-sans text-sm text-ivory">
                {deal.application.investorProfile.firstName} {deal.application.investorProfile.lastName}
              </p>
              <p className="font-sans text-xs text-stone">{deal.application.investorProfile.user.email}</p>
              {deal.response && (
                <div className="mt-3 pt-3 border-t border-carbon/60">
                  <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Investor Response</p>
                  <p className="font-sans text-sm text-ivory">{INTENT_LABEL[deal.response.intent] ?? deal.response.intent}</p>
                  {deal.response.comment && <p className="font-sans text-xs text-stone italic mt-1">&ldquo;{deal.response.comment}&rdquo;</p>}
                </div>
              )}
              {deal.offer && (
                <div className="mt-3 pt-3 border-t border-carbon/60">
                  <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Investor Offer</p>
                  <p className="font-sans text-sm text-ivory">
                    {fmt(Number(deal.offer.amount))} · {deal.offer.depositPercent}% deposit · {deal.offer.financingSource.toLowerCase()}
                  </p>
                  <p className="font-sans text-[0.55rem] text-stone mt-0.5">
                    {deal.offer.status === 'PENDING' ? 'Pending vendor decision' : `Vendor: ${deal.offer.status.toLowerCase()}`}
                    {' · '}submitted {deal.offer.submittedAt.toLocaleDateString('en-GB')}
                    {deal.offer.targetExchangeDate && <> · target exchange {deal.offer.targetExchangeDate.toLocaleDateString('en-GB')}</>}
                  </p>
                  {deal.offer.conditions && (
                    <p className="font-sans text-xs text-stone italic mt-1 whitespace-pre-line border-l-2 border-gold/30 pl-3">{deal.offer.conditions}</p>
                  )}
                  {deal.offer.vendorDecisionNote && (
                    <p className="font-sans text-xs text-stone italic mt-2">Decision note: &ldquo;{deal.offer.vendorDecisionNote}&rdquo;</p>
                  )}
                  <OfferDecisionPanel dealId={deal.id} pending={deal.offer.status === 'PENDING'} />
                </div>
              )}
            </div>
          </div>

          {/* Stage controls */}
          <div className="border border-carbon p-6">
            <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Update Stage</h2>
            <DealStagePanel
              dealId={deal.id}
              currentStage={deal.stage}
              dealLeadUserId={deal.dealLeadUserId}
              solicitorContact={deal.solicitorContact}
              brokerContact={deal.brokerContact}
              admins={admins}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
