import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const applications = await prisma.application.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      investorProfile: {
        include: { user: { select: { email: true } } },
      },
    },
  })

  return NextResponse.json({
    investors: applications.map((app) => ({
      applicationId: app.id,
      name: `${app.investorProfile.firstName} ${app.investorProfile.lastName}`,
      email: app.investorProfile.user.email,
      strategy: app.investorProfile.strategy,
      budgetMin: Number(app.investorProfile.budgetMin),
      budgetMax: Number(app.investorProfile.budgetMax),
      buyerType: app.investorProfile.buyerType,
      status: app.status,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    })),
  })
}
