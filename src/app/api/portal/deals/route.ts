import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

  const deals = await prisma.deal.findMany({
    where: { applicationId },
    orderBy: { createdAt: 'desc' },
    include: { response: true },
  })

  return NextResponse.json({ deals })
}
