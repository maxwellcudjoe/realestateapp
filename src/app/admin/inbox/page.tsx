import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UnmatchedEmailRow } from '@/components/admin/UnmatchedEmailRow'
import { BccRuleBanner } from '@/components/admin/BccRuleBanner'

export const dynamic = 'force-dynamic'

export default async function AdminInboxPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const unmatched = await prisma.emailMessage.findMany({
    where: {
      classification: 'KEPT',
      direction: 'INBOUND',
      thread: { dealId: null },
    },
    include: { from: true },
    orderBy: { receivedAt: 'desc' },
    take: 100,
  })

  const recent = await prisma.emailMessage.findMany({
    where: {
      classification: 'KEPT',
      thread: { dealId: { not: null } },
    },
    include: { from: true, thread: true },
    orderBy: { receivedAt: 'desc' },
    take: 50,
  })

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 text-ivory">
      <BccRuleBanner />

      <header>
        <h1 className="text-2xl font-semibold">Dealer Inbox</h1>
        <p className="text-stone-400 text-sm">
          Mail arriving at <code>info@revebatir.co.uk</code> — unmatched on top, recent matched below.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-medium mb-2">Unmatched ({unmatched.length})</h2>
        {unmatched.length === 0 ? (
          <p className="text-sm text-stone-400">Nothing waiting for triage. Good.</p>
        ) : (
          <table className="w-full text-left">
            <thead className="text-xs uppercase text-stone-400">
              <tr>
                <th className="px-3 py-2">Received</th>
                <th className="px-3 py-2">From</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {unmatched.map((e) => (
                <UnmatchedEmailRow
                  key={e.id}
                  email={{
                    id: e.id,
                    subject: e.subject,
                    fromEmail: e.from.email,
                    receivedAt: e.receivedAt.toISOString(),
                    bodyTextSnippet: e.bodyText.slice(0, 120),
                  }}
                />
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Recent across deals</h2>
        <ul className="divide-y divide-stone-700">
          {recent.map((e) => (
            <li key={e.id} className="py-2 text-sm flex items-center justify-between">
              <div>
                <div className="font-medium">{e.subject}</div>
                <div className="text-stone-400 text-xs">
                  {e.from.email} · {new Date(e.receivedAt).toLocaleString('en-GB')}
                </div>
              </div>
              {e.thread.dealId && (
                <Link
                  href={`/admin/deals/${e.thread.dealId}/correspondence`}
                  className="text-emerald-400 hover:underline"
                >
                  Open deal →
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
