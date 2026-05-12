import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { InvestorTable } from '@/components/admin/InvestorTable'

export default async function AdminInvestorsPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const applications = await prisma.application.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      investorProfile: {
        include: { user: { select: { email: true } } },
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
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
  }))

  return (
    <div>
      <h1 className="font-serif text-4xl font-light text-ivory mb-8">
        Investor Applications
      </h1>
      <InvestorTable investors={investors} />
    </div>
  )
}
