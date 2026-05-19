import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { StatusPanel } from '@/components/admin/StatusPanel'
import { SubscriptionPanel } from '@/components/admin/SubscriptionPanel'
import { StatusHistoryTimeline } from '@/components/admin/StatusHistoryTimeline'
import { UserActionsPanel } from '@/components/admin/UserActionsPanel'
import { InvestorProfileEditor } from '@/components/admin/InvestorProfileEditor'
import { PortfolioSummaryCard } from '@/components/admin/PortfolioSummaryCard'
import { KycRecheckButton } from '@/components/admin/KycRecheckButton'
import {
  COUNTRIES, SOURCE_OF_FUNDS_OPTIONS, ageOn,
  experienceLabel, timelineLabel, mortgageStatusLabel,
} from '@/lib/compliance'
import { strategyLabel, legacyToStrategies } from '@/lib/strategies'
import { DocumentReviewRow } from '@/components/admin/DocumentReviewRow'
import { premiumMonthlyAmount, premiumAnnualAmount } from '@/lib/subscriptions'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function countryLabel(code: string | null) {
  if (!code) return '—'
  return COUNTRIES.find((c) => c.code === code)?.label ?? code
}

function sourceOfFundsLabel(value: string | null) {
  if (!value) return '—'
  return SOURCE_OF_FUNDS_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export default async function AdminInvestorDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const app = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      investorProfile: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              tier: true,
              subscription: true,
              emailVerifiedAt: true,
              totpEnabledAt: true,
              deletedAt: true,
              createdAt: true,
            },
          },
          structuredAreas: { orderBy: { label: 'asc' } },
          strategies: true,
        },
      },
      documents: { orderBy: { uploadedAt: 'desc' } },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!app) redirect('/admin/investors')

  const p = app.investorProfile
  const fmt = (n: number) => `£${Number(n).toLocaleString('en-GB')}`

  const properties = await prisma.property.findMany({
    where: { userId: p.user.id },
    orderBy: { completionDate: 'desc' },
    select: {
      id: true,
      address: true,
      purchasePrice: true,
      currentValueEstimate: true,
      completionDate: true,
      tenancyStatus: true,
    },
  })

  const actorIds = Array.from(
    new Set(app.statusHistory.map((h) => h.changedByUserId).filter(Boolean) as string[]),
  )
  const actors = actorIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, email: true },
      })
    : []
  const actorEmailById = new Map(actors.map((a) => [a.id, a.email]))
  const historyForTimeline = app.statusHistory.map((h) => ({
    id: h.id,
    fromStatus: h.fromStatus,
    toStatus: h.toStatus,
    note: h.note,
    changedByEmail: h.changedByUserId ? actorEmailById.get(h.changedByUserId) ?? null : null,
    createdAt: h.createdAt.toISOString(),
  }))

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="border border-carbon p-6 space-y-3">
          <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Investor Profile</h2>
          {([
            ['Email', p.user.email],
            ['Phone', p.phone],
            ['Address', `${p.addressLine1}, ${p.city} ${p.postcode}`],
            ['Budget', `${fmt(Number(p.budgetMin))} – ${fmt(Number(p.budgetMax))}`],
            ['Buyer Type', p.buyerType],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label}>
              <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">{label}</p>
              <p className="font-sans text-sm text-ivory">{value}</p>
            </div>
          ))}
          <div>
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Strategies</p>
            {(() => {
              const codes = p.strategies.length > 0
                ? p.strategies.map((s) => s.strategy)
                : legacyToStrategies(p.strategy)
              return codes.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {codes.map((c) => (
                    <span key={c} className="bg-gold/10 border border-gold/30 px-2 py-0.5 text-xs text-ivory">
                      {strategyLabel(c)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="font-sans text-sm text-ivory italic">{p.strategy}</p>
              )
            })()}
          </div>
          <div>
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Target Areas</p>
            {p.structuredAreas.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {p.structuredAreas.map((a) => (
                  <span key={a.id} className="bg-gold/10 border border-gold/30 px-2 py-0.5 text-xs text-ivory">
                    {a.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="font-sans text-sm text-ivory italic">{p.targetAreas || '—'}</p>
            )}
          </div>
        </div>

        <div className="border border-carbon p-6">
          <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">KYC Documents</h2>
          {app.kycCompletedAt && (
            <p className="font-sans text-[0.6rem] text-stone mb-1">
              KYC completed {app.kycCompletedAt.toLocaleDateString('en-GB')}
            </p>
          )}
          {app.kycExpiresAt && (
            <p className={`font-sans text-[0.6rem] mb-3 ${app.kycExpiresAt < new Date() ? 'text-red-400' : app.kycExpiresAt.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 ? 'text-amber-400' : 'text-stone'}`}>
              KYC {app.kycExpiresAt < new Date() ? 'expired' : 'expires'} {app.kycExpiresAt.toLocaleDateString('en-GB')}
            </p>
          )}
          <KycRecheckButton applicationId={app.id} kycExpiresAt={app.kycExpiresAt?.toISOString() ?? null} />
          {app.documents.length === 0 ? (
            <p className="font-sans text-xs text-stone">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-4">
              {app.documents.map((doc) => (
                <DocumentReviewRow
                  key={doc.id}
                  docId={doc.id}
                  type={doc.type}
                  fileName={doc.fileName}
                  reviewStatus={doc.reviewStatus}
                  reviewNote={doc.reviewNote}
                  reviewedAt={doc.reviewedAt?.toISOString() ?? null}
                  expiresAt={doc.expiresAt?.toISOString() ?? null}
                />
              ))}
            </div>
          )}
        </div>

        <div className="border border-carbon p-6">
          <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Status & Actions</h2>
          <StatusPanel
            applicationId={app.id}
            currentStatus={app.status}
            adminNotes={app.adminNotes}
          />
        </div>
      </div>

      {/* Compliance / AML panel — full-width below the 3 columns */}
      <div className="mt-8 border border-carbon p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">Compliance & AML</h2>
          {p.complianceCompleted ? (
            <span className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">Complete</span>
          ) : (
            <span className="font-sans text-[0.6rem] uppercase tracking-widest text-stone">Legacy account — data missing</span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Date of Birth</p>
            <p className="font-sans text-sm text-ivory">
              {p.dateOfBirth ? `${p.dateOfBirth.toLocaleDateString('en-GB')} (age ${ageOn(p.dateOfBirth)})` : '—'}
            </p>
          </div>
          <div>
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Nationality</p>
            <p className="font-sans text-sm text-ivory">{countryLabel(p.nationality)}</p>
          </div>
          <div>
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Tax Residency</p>
            <p className="font-sans text-sm text-ivory">
              {countryLabel(p.taxResidency)}
              {p.taxResidency && p.taxResidency !== 'GB' && (
                <span className="ml-2 text-[0.55rem] uppercase tracking-widest text-gold">+2% SDLT surcharge</span>
              )}
            </p>
          </div>
          <div>
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">NI Number</p>
            <p className="font-sans text-sm text-ivory font-mono">{p.niNumber ?? '—'}</p>
          </div>
          <div>
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Source of Funds</p>
            <p className="font-sans text-sm text-ivory">{sourceOfFundsLabel(p.sourceOfFunds)}</p>
            {p.sourceOfFundsDetail && (
              <p className="font-sans text-xs text-stone mt-1 italic">&ldquo;{p.sourceOfFundsDetail}&rdquo;</p>
            )}
          </div>
          <div>
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">PEP Status</p>
            {p.isPep ? (
              <>
                <p className="font-sans text-sm text-gold">⚠ Politically Exposed Person</p>
                {p.pepDetails && (
                  <p className="font-sans text-xs text-stone mt-1 italic">&ldquo;{p.pepDetails}&rdquo;</p>
                )}
                <p className="font-sans text-[0.55rem] uppercase tracking-widest text-gold mt-1">Enhanced Due Diligence required</p>
              </>
            ) : (
              <p className="font-sans text-sm text-ivory">Not a PEP</p>
            )}
          </div>
          <div>
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Marketing Consent</p>
            <p className="font-sans text-sm text-ivory">
              {p.marketingConsentAt
                ? `Yes (since ${p.marketingConsentAt.toLocaleDateString('en-GB')})`
                : 'No'}
            </p>
          </div>
        </div>
      </div>

      {/* Experience & Funding panel — Task 2.4 */}
      <div className="mt-8 border border-carbon p-6">
        <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Experience & Funding</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Experience</p>
            <p className="font-sans text-sm text-ivory">{experienceLabel(p.experienceLevel)}</p>
          </div>
          <div>
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Timeline</p>
            <p className="font-sans text-sm text-ivory">{timelineLabel(p.timelineToBuy)}</p>
          </div>
          <div>
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Referral Source</p>
            <p className="font-sans text-sm text-ivory">{p.referralSource ?? '—'}</p>
          </div>
          {p.buyerType === 'mortgage' && (
            <>
              <div>
                <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Mortgage Status</p>
                <p className="font-sans text-sm text-ivory">{mortgageStatusLabel(p.mortgageStatus)}</p>
              </div>
              <div>
                <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Lender / Max LTV</p>
                <p className="font-sans text-sm text-ivory">
                  {p.mortgageLender ?? '—'}{typeof p.maxLtv === 'number' ? ` / ${p.maxLtv}%` : ''}
                </p>
              </div>
            </>
          )}
          {p.depositAvailable && (
            <div>
              <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Deposit Available</p>
              <p className="font-sans text-sm text-ivory">{fmt(Number(p.depositAvailable))}</p>
            </div>
          )}
        </div>
      </div>

      <PortfolioSummaryCard
        userId={p.user.id}
        properties={properties.map((prop) => ({
          id: prop.id,
          address: prop.address,
          purchasePrice: Number(prop.purchasePrice),
          currentValueEstimate: prop.currentValueEstimate !== null ? Number(prop.currentValueEstimate) : null,
          completionDate: prop.completionDate.toISOString(),
          tenancyStatus: prop.tenancyStatus,
        }))}
      />

      <div className="mt-8 border border-carbon p-6">
        <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Status History</h2>
        <StatusHistoryTimeline history={historyForTimeline} />
      </div>

      <div className="mt-8">
        <UserActionsPanel
          userId={p.user.id}
          email={p.user.email}
          emailVerified={!!p.user.emailVerifiedAt}
          totpEnabled={!!p.user.totpEnabledAt}
          isDeleted={!!p.user.deletedAt}
        />
      </div>

      <InvestorProfileEditor
        applicationId={app.id}
        initial={{
          firstName: p.firstName,
          lastName: p.lastName,
          phone: p.phone,
          addressLine1: p.addressLine1,
          city: p.city,
          postcode: p.postcode,
          entityType: p.entityType,
          companyName: p.companyName,
          companyNumber: p.companyNumber,
          vatNumber: p.vatNumber,
          companyAddress: p.companyAddress,
          budgetMin: Number(p.budgetMin),
          budgetMax: Number(p.budgetMax),
          buyerType: p.buyerType,
          dateOfBirth: p.dateOfBirth?.toISOString() ?? null,
          nationality: p.nationality,
          taxResidency: p.taxResidency,
          niNumber: p.niNumber,
          isPep: p.isPep,
          pepDetails: p.pepDetails,
          sourceOfFunds: p.sourceOfFunds,
          sourceOfFundsDetail: p.sourceOfFundsDetail,
          experienceLevel: p.experienceLevel,
          timelineToBuy: p.timelineToBuy,
          mortgageStatus: p.mortgageStatus,
          mortgageLender: p.mortgageLender,
          maxLtv: p.maxLtv,
          depositAvailable: p.depositAvailable !== null ? Number(p.depositAvailable) : null,
          referralSource: p.referralSource,
        }}
      />

      <div className="mt-8">
        <SubscriptionPanel
          userId={p.user.id}
          tier={(p.user.tier ?? 'FREE') as 'FREE' | 'PREMIUM'}
          subscription={p.user.subscription ? {
            billingPeriod: p.user.subscription.billingPeriod,
            amount: Number(p.user.subscription.amount),
            startedAt: p.user.subscription.startedAt.toISOString(),
            cancelledAt: p.user.subscription.cancelledAt?.toISOString() ?? null,
            nextRenewalAt: p.user.subscription.nextRenewalAt.toISOString(),
          } : null}
          defaultMonthly={premiumMonthlyAmount()}
          defaultAnnual={premiumAnnualAmount()}
        />
      </div>

      <div className="mt-8 flex items-center gap-6 flex-wrap">
        <Link
          href={`/admin/audit?actorUserId=${p.user.id}`}
          className="font-sans text-xs uppercase tracking-widest text-stone hover:text-gold transition-colors"
        >
          Audit by this user →
        </Link>
        <Link
          href={`/admin/audit?resourceId=${p.user.id}`}
          className="font-sans text-xs uppercase tracking-widest text-stone hover:text-gold transition-colors"
        >
          Audit about this user →
        </Link>
      </div>
    </div>
  )
}
