import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isValidStatus, statusLabel, sourceChannelLabel } from '@/lib/leads/source'
import type { LeadSourceChannel, LeadStatus } from '@/lib/leads/types'

export const dynamic = 'force-dynamic'

export default async function LeadsListPage({ searchParams }: { searchParams: { status?: string } }) {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/login')

  const where: Record<string, unknown> = {}
  if (searchParams.status && isValidStatus(searchParams.status)) where.status = searchParams.status

  const leads = await prisma.lead.findMany({
    where, orderBy: { createdAt: 'desc' }, take: 200,
    include: { _count: { select: { notes: true } } },
  })

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-stone-600">Admin-captured investor prospects.</p>
        </div>
        <Link href="/admin/leads/new" className="bg-stone-900 text-white px-3 py-2 rounded text-sm">+ Create lead</Link>
      </header>
      <nav className="flex gap-2 text-xs">
        <Link href="/admin/leads" className={!searchParams.status ? 'font-semibold underline' : 'text-stone-600 hover:underline'}>All</Link>
        {['NEW','CONTACTED','QUALIFIED','CONVERTED','DECLINED','DORMANT'].map((s) => (
          <Link key={s} href={`/admin/leads?status=${s}`} className={searchParams.status === s ? 'font-semibold underline' : 'text-stone-600 hover:underline'}>
            {statusLabel(s as LeadStatus)}
          </Link>
        ))}
      </nav>
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-stone-500">
          <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Notes</th><th className="px-3 py-2">Age</th></tr>
        </thead>
        <tbody>
          {leads.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-stone-500">No leads yet.</td></tr>}
          {leads.map((l) => (
            <tr key={l.id} className="border-b border-stone-200 hover:bg-stone-50">
              <td className="px-3 py-2"><Link href={`/admin/leads/${l.id}`} className="text-emerald-700 hover:underline">{l.name}</Link></td>
              <td className="px-3 py-2 text-stone-600 text-xs">{l.email ?? l.phone ?? '—'}</td>
              <td className="px-3 py-2 text-xs">{sourceChannelLabel(l.sourceChannel as LeadSourceChannel)}{l.sourceReferrer ? ` · ${l.sourceReferrer}` : ''}</td>
              <td className="px-3 py-2 text-xs">{statusLabel(l.status as LeadStatus)}</td>
              <td className="px-3 py-2 text-xs">{l._count.notes}</td>
              <td className="px-3 py-2 text-xs">{Math.floor((Date.now() - l.createdAt.getTime()) / 86_400_000)}d</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
