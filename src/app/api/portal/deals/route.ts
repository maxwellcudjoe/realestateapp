import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dealVisibilityWhere } from '@/lib/deal-visibility'
import type { UserTier } from '@/lib/subscriptions'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      investorProfile: {
        include: { application: { select: { id: true } } },
      },
    },
  })

  const applicationId = user?.investorProfile?.application?.id
  if (!applicationId) return NextResponse.json({ error: 'No application found' }, { status: 404 })

  const tier = ((user?.tier as UserTier | undefined) ?? 'FREE')
  const deals = await prisma.deal.findMany({
    where: { applicationId, ...dealVisibilityWhere(tier) },
    orderBy: { createdAt: 'desc' },
    include: { response: true },
  })

  return NextResponse.json({ deals })
}
