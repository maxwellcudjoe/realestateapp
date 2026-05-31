import { prisma } from '@/lib/prisma'
import { EmailThread } from '@/components/admin/EmailThread'
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface AttachmentRecord {
  path: string
  filename: string
  size: number
  mime: string
  error?: string
}

interface PageProps {
  params: { id: string }
}

export default async function CorrespondencePage({ params }: PageProps) {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/login')

  const { id } = params

  const deal = await prisma.deal.findUnique({
    where: { id },
    select: { id: true, address: true, title: true },
  })
  if (!deal) notFound()

  const threads = await prisma.dealerThread.findMany({
    where: { dealId: deal.id, emails: { some: { classification: 'KEPT' } } },
    orderBy: { lastAt: 'desc' },
    include: {
      emails: {
        where: { classification: 'KEPT' },
        orderBy: { receivedAt: 'asc' },
        include: { from: true },
      },
    },
  })

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Correspondence</h1>
        <p className="text-stone-600 text-sm">{deal.address ?? deal.title}</p>
      </header>

      {threads.length === 0 ? (
        <p className="text-sm text-stone-500">No correspondence yet for this deal.</p>
      ) : (
        <div className="space-y-3">
          {threads.map((t) => (
            <EmailThread
              key={t.id}
              thread={{
                id: t.id,
                subject: t.subject,
                emails: t.emails.map((e) => {
                  const attachments: AttachmentRecord[] = e.attachmentsJson
                    ? JSON.parse(e.attachmentsJson)
                    : []
                  return {
                    id: e.id,
                    direction: e.direction as 'INBOUND' | 'OUTBOUND',
                    fromEmail: e.from.email,
                    fromName: e.from.name,
                    receivedAt: e.receivedAt.toISOString(),
                    bodyText: e.bodyText,
                    attachments: attachments
                      .filter((a) => !a.error) // hide failed uploads from the thread view
                      .map((a) => ({ filename: a.filename, size: a.size, path: a.path })),
                  }
                }),
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
