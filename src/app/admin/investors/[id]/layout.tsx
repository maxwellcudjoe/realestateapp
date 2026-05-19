import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { entityTypeLabel } from '@/lib/compliance'
import { InvestorTabStrip } from '@/components/admin/InvestorTabStrip'

export const dynamic = 'force-dynamic'

export default async function AdminInvestorLayout({
  params,
  children,
}: {
  params: { id: string }
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      status: true,
      investorProfile: {
        select: {
          firstName: true,
          lastName: true,
          entityType: true,
          companyName: true,
          companyNumber: true,
          vatNumber: true,
          isPep: true,
          user: {
            select: {
              email: true,
              tier: true,
              emailVerifiedAt: true,
              totpEnabledAt: true,
              deletedAt: true,
            },
          },
        },
      },
    },
  })
  if (!application) redirect('/admin/investors')

  const p = application.investorProfile
  const u = p.user

  return (
    <div>
      <Link href="/admin/investors" className="font-sans text-xs uppercase tracking-widest text-stone hover:text-gold transition-colors mb-4 inline-block">
        ← Back to investors
      </Link>

      {u.deletedAt && (
        <div className="mb-6 border border-red-500/40 bg-red-500/5 px-4 py-3">
          <p className="font-sans text-xs uppercase tracking-widest text-red-400">
            ⚠ Soft-deleted on {u.deletedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      )}

      <div className="mb-2">
        <h1 className="font-serif text-4xl font-light text-ivory">
          {p.firstName} {p.lastName}
        </h1>
        <p className="font-sans text-sm text-stone mt-1">{u.email}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            data-testid="email-verified-chip"
            className={`font-sans text-[0.55rem] uppercase tracking-widest px-2 py-0.5 border ${
              u.emailVerifiedAt ? 'text-gold border-gold/40 bg-gold/5' : 'text-stone border-carbon'
            }`}
          >
            {u.emailVerifiedAt ? '✓ Email verified' : 'Email unverified'}
          </span>
          <span
            data-testid="totp-chip"
            className={`font-sans text-[0.55rem] uppercase tracking-widest px-2 py-0.5 border ${
              u.totpEnabledAt ? 'text-gold border-gold/40 bg-gold/5' : 'text-stone border-carbon'
            }`}
          >
            {u.totpEnabledAt ? '✓ 2FA enabled' : '2FA off'}
          </span>
          {u.tier === 'PREMIUM' && (
            <span className="font-sans text-[0.55rem] uppercase tracking-widest text-gold border border-gold/40 bg-gold/5 px-2 py-0.5">
              Premium
            </span>
          )}
          {p.isPep && (
            <span className="font-sans text-[0.55rem] uppercase tracking-widest text-gold border border-gold/60 bg-gold/10 px-2 py-0.5">
              ⚠ PEP
            </span>
          )}
          <span className="font-sans text-[0.55rem] uppercase tracking-widest text-stone border border-carbon px-2 py-0.5">
            {application.status.replace(/_/g, ' ')}
          </span>
          {p.entityType !== 'INDIVIDUAL' && (
            <>
              <span className="font-sans text-[0.55rem] uppercase tracking-widest text-gold bg-gold/10 border border-gold/30 px-2 py-0.5">
                {entityTypeLabel(p.entityType)}
              </span>
              {p.companyName && <span className="font-sans text-sm text-stone">— {p.companyName}</span>}
              {p.companyNumber && <span className="font-sans text-xs text-stone font-mono">#{p.companyNumber}</span>}
              {p.vatNumber && <span className="font-sans text-xs text-stone">VAT {p.vatNumber}</span>}
            </>
          )}
        </div>
      </div>

      <InvestorTabStrip applicationId={application.id} />

      <div className="mt-8">
        {children}
      </div>
    </div>
  )
}
