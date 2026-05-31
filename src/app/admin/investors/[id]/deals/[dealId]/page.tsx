import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { DealStagePanel } from '@/components/admin/DealStagePanel'
import { OfferDecisionPanel } from '@/components/admin/OfferDecisionPanel'
import { InvoiceIssuer } from '@/components/admin/InvoiceIssuer'
import { DealMessageThread } from '@/components/portal/DealMessageThread'
import { DealDocumentRoom } from '@/components/portal/DealDocumentRoom'
import { ViewingPanel } from '@/components/portal/ViewingPanel'
import { DEAL_STAGES } from '@/lib/deal-stages'
import { calculateSuccessFee, successFeePercent } from '@/lib/invoices'
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
        application: { include: { investorProfile: { include: { user: { select: { id: true, email: true } } } } } },
        response: true,
        stageHistory: { orderBy: { createdAt: 'asc' } },
        dealLeadUser: { select: { id: true, email: true } },
        offer: true,
        invoices: { orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.user.findMany({ where: { role: 'admin' }, select: { id: true, email: true }, orderBy: { email: 'asc' } }),
  ])
  if (!deal || deal.applicationId !== params.id) redirect(`/admin/investors/${params.id}/deals`)

  const investorUserId = deal.application.investorProfile.user.id
  const successPct = successFeePercent()
  // M4 fix — success fee is normally a % of the *agreed price* (the accepted
  // offer), not the asking price. Falls back to askingPrice when no offer exists
  // (rare on COMPLETED but defensive).
  const successFeeBase = deal.offer?.status === 'ACCEPTED'
    ? Number(deal.offer.amount)
    : Number(deal.askingPrice)
  const suggestedSuccessFee = calculateSuccessFee(successFeeBase, successPct)
  const hasSuccessInvoice = deal.invoices.some((i) => i.type === 'SUCCESS' && i.status !== 'VOID')
  const hasSourcingInvoice = deal.invoices.some((i) => i.type === 'SOURCING' && i.status !== 'VOID')

  const fmt = (n: number) => `£${Number(n).toLocaleString('en-GB')}`

  return (
    <div className="min-h-screen bg-obsidian pt-[72px]">
      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="flex items-center justify-between mb-4">
          <Link href={`/admin/investors/${params.id}/deals`} className="font-sans text-xs uppercase tracking-widest text-stone hover:text-gold transition-colors inline-block">
            ← All deals for this investor
          </Link>
          <Link href={`/admin/deals/${deal.id}/correspondence`} className="font-sans text-xs uppercase tracking-widest text-stone hover:text-gold transition-colors inline-block">
            View correspondence →
          </Link>
        </div>
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

        <div className="mt-8 border border-carbon p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">Invoices for this deal</h2>
            <Link href={`/admin/investors/${params.id}/invoices`} className="font-sans text-[0.6rem] uppercase tracking-widest text-stone hover:text-gold transition-colors">
              All invoices →
            </Link>
          </div>
          {deal.invoices.length === 0 ? (
            <p className="font-sans text-xs text-stone mb-4">No invoices issued for this deal yet.</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {deal.invoices.map((i) => (
                <li key={i.id} className="flex items-center justify-between font-sans text-sm">
                  <a href={`/api/admin/invoices/${i.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">{i.invoiceNumber}</a>
                  <span className="text-stone">{i.type} · £{Number(i.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })} · <span className={i.status === 'PAID' ? 'text-green-400' : i.status === 'VOID' ? 'text-stone/60' : 'text-gold'}>{i.status}</span></span>
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-3">
            {!hasSourcingInvoice && (deal.stage === 'OFFER_ACCEPTED' || deal.stage === 'MEMO_OF_SALE' || deal.stage === 'CONVEYANCING' || deal.stage === 'SURVEY' || deal.stage === 'MORTGAGE' || deal.stage === 'EXCHANGED' || deal.stage === 'COMPLETED') && (
              <InvoiceIssuer
                userId={investorUserId}
                dealId={deal.id}
                defaultType="SOURCING"
                defaultDescription={`Sourcing fee — ${deal.address}`}
                triggerLabel="Issue sourcing invoice"
              />
            )}
            {!hasSuccessInvoice && deal.stage === 'COMPLETED' && (
              <InvoiceIssuer
                userId={investorUserId}
                dealId={deal.id}
                defaultType="SUCCESS"
                defaultAmount={suggestedSuccessFee}
                defaultDescription={`Success fee (${successPct}% of £${successFeeBase.toLocaleString('en-GB')}) — ${deal.address}`}
                triggerLabel={`Issue success invoice (suggested £${suggestedSuccessFee.toLocaleString('en-GB', { minimumFractionDigits: 2 })})`}
              />
            )}
          </div>
        </div>

        <div className="mt-8 border border-carbon p-6">
          <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Viewings</h2>
          <ViewingPanel dealId={deal.id} isAdmin={true} />
        </div>

        <div className="mt-8 border border-carbon p-6">
          <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Documents</h2>
          <DealDocumentRoom dealId={deal.id} isAdmin={true} />
        </div>

        <div className="mt-8 border border-carbon p-6">
          <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Discussion with Investor</h2>
          <DealMessageThread dealId={deal.id} />
        </div>
      </div>
    </div>
  )
}
