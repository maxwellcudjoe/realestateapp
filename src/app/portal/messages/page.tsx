import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { MessagesClient } from '@/components/portal/MessagesClient'

export const dynamic = 'force-dynamic'

export default async function PortalMessagesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      investorProfile: {
        include: {
          application: {
            include: {
              messages: { orderBy: { createdAt: 'desc' } },
            },
          },
        },
      },
    },
  })

  if (!user?.investorProfile?.application) {
    return <p className="font-sans text-sm text-stone">No application found.</p>
  }

  const messages = user.investorProfile.application.messages.map((m) => ({
    id: m.id,
    subject: m.subject,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  }))

  return (
    <div>
      <h1 className="font-serif text-4xl font-light text-ivory mb-2">Messages</h1>
      <p className="font-sans text-sm text-stone mb-12">
        Send a query to the Rêve Bâtir team. We respond within 24 hours.
      </p>

      <MessagesClient initialMessages={messages} />
    </div>
  )
}
