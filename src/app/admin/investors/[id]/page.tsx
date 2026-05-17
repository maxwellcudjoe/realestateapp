import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { StatusPanel } from '@/components/admin/StatusPanel'
import {
  COUNTRIES, SOURCE_OF_FUNDS_OPTIONS, ageOn,
  experienceLabel, timelineLabel, mortgageStatusLabel, entityTypeLabel,
} from '@/lib/compliance'
import { strategyLabel, legacyToStrategies } from '@/lib/strategies'
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
          user: { select: { email: true } },
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

  return (
    <div>
      <Link href="/admin/investors" className="font-sans text-xs uppercase tracking-widest text-stone hover:text-gold transition-colors mb-4 inline-block">
        ← Back to List
      </Link>
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-light text-ivory">
          {p.firstName} {p.lastName}
        </h1>
        {p.entityType !== 'INDIVIDUAL' && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="font-sans text-[0.55rem] uppercase tracking-widest text-gold bg-gold/10 border border-gold/30 px-2 py-0.5">
              {entityTypeLabel(p.entityType)}
            </span>
            {p.companyName && <span className="font-sans text-sm text-stone">— {p.companyName}</span>}
            {p.companyNumber && <span className="font-sans text-xs text-stone font-mono">#{p.companyNumber}</span>}
            {p.vatNumber && <span className="font-sans text-xs text-stone">VAT {p.vatNumber}</span>}
          </div>
        )}
      </div>

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
          {app.documents.length === 0 ? (
            <p className="font-sans text-xs text-stone">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {app.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between border-b border-carbon/50 pb-2">
                  <div>
                    <p className="font-sans text-xs text-ivory">{doc.type.replace(/_/g, ' ')}</p>
                    <p className="font-sans text-[0.55rem] text-stone">{doc.fileName}</p>
                  </div>
                  <a
                    href={`/api/admin/documents/${doc.id}/url`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans text-[0.6rem] uppercase tracking-widest text-gold hover:text-ivory transition-colors"
                  >
                    View
                  </a>
                </div>
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

      <div className="mt-8">
        <Link
          href={`/admin/investors/${params.id}/deals`}
          className="font-sans text-xs uppercase tracking-widest text-gold hover:text-ivory transition-colors"
        >
          View Deals →
        </Link>
      </div>
    </div>
  )
}
