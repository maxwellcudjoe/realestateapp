import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { DealsClient } from '@/components/portal/DealsClient'

export const dynamic = 'force-dynamic'

export default async function PortalDealsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      investorProfile: {
        include: {
          application: {
            include: {
              deals: {
                orderBy: { createdAt: 'desc' },
                include: { response: true },
              },
            },
          },
        },
      },
    },
  })

  if (!user?.investorProfile?.application) {
    return <p className="font-sans text-sm text-stone">No application found.</p>
  }

  const deals = user.investorProfile.application.deals.map((d) => ({
    id: d.id,
    title: d.title,
    address: d.address,
    askingPrice: Number(d.askingPrice),
    summary: d.summary,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    response: d.response
      ? {
          id: d.response.id,
          intent: d.response.intent,
          comment: d.response.comment,
          createdAt: d.response.createdAt.toISOString(),
          updatedAt: d.response.updatedAt.toISOString(),
        }
      : null,
  }))

  return (
    <div>
      <h1 className="font-serif text-4xl font-light text-ivory mb-2">Deals</h1>
      <p className="font-sans text-sm text-stone mb-12">
        Property deals matched to your investment criteria. Respond to let us know your interest.
      </p>
      <DealsClient deals={deals} />
    </div>
  )
}
