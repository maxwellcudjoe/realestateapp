import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { InvestorTable } from '@/components/admin/InvestorTable'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminInvestorsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const applications = await prisma.application.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      investorProfile: {
        include: { user: { select: { email: true, tier: true, deletedAt: true } } },
      },
    },
  })

  const investors = applications.map((app) => ({
    applicationId: app.id,
    name: `${app.investorProfile.firstName} ${app.investorProfile.lastName}`,
    email: app.investorProfile.user.email,
    strategy: app.investorProfile.strategy,
    budgetMin: Number(app.investorProfile.budgetMin),
    budgetMax: Number(app.investorProfile.budgetMax),
    buyerType: app.investorProfile.buyerType,
    status: app.status,
    tier: app.investorProfile.user.tier,
    isPep: app.investorProfile.isPep,
    entityType: app.investorProfile.entityType,
    complianceCompleted: app.investorProfile.complianceCompleted,
    kycExpiresAt: app.kycExpiresAt?.toISOString() ?? null,
    deletedAt: app.investorProfile.user.deletedAt?.toISOString() ?? null,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h1 className="font-serif text-4xl font-light text-ivory">
          Investor Applications
        </h1>
        <div className="flex gap-3">
          <Link
            href="/admin/audit"
            className="inline-block px-6 py-3 text-xs font-semibold uppercase tracking-widest border border-carbon text-stone hover:border-gold hover:text-gold transition-colors"
          >
            Audit log
          </Link>
          <Link
            href="/admin/match"
            className="inline-block px-6 py-3 text-xs font-semibold uppercase tracking-widest border border-gold text-gold hover:bg-gold hover:text-obsidian transition-colors"
          >
            Match &amp; post deal &rarr;
          </Link>
        </div>
      </div>
      <InvestorTable investors={investors} />
    </div>
  )
}
