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
          <h1 className="text-2xl font-semibold text-ivory">Leads</h1>
          <p className="text-sm text-stone">Admin-captured investor prospects.</p>
        </div>
        <Link
          href="/admin/leads/new"
          className="bg-gold text-obsidian font-medium px-3 py-2 rounded text-sm hover:bg-gold-light transition-colors"
        >
          + Create lead
        </Link>
      </header>
      <nav className="flex gap-3 text-xs border-b border-white/10 pb-2">
        <Link
          href="/admin/leads"
          className={!searchParams.status ? 'text-ivory font-semibold underline underline-offset-4 decoration-gold' : 'text-stone hover:text-ivory transition-colors'}
        >
          All
        </Link>
        {['NEW','CONTACTED','QUALIFIED','CONVERTED','DECLINED','DORMANT'].map((s) => (
          <Link
            key={s}
            href={`/admin/leads?status=${s}`}
            className={searchParams.status === s ? 'text-ivory font-semibold underline underline-offset-4 decoration-gold' : 'text-stone hover:text-ivory transition-colors'}
          >
            {statusLabel(s as LeadStatus)}
          </Link>
        ))}
      </nav>
      <table className="w-full text-left text-sm">
        <thead className="text-[0.6rem] uppercase tracking-widest text-stone">
          <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Notes</th><th className="px-3 py-2">Age</th></tr>
        </thead>
        <tbody>
          {leads.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-stone">No leads yet.</td></tr>}
          {leads.map((l) => (
            <tr key={l.id} className="border-b border-white/10 hover:bg-white/[0.04] transition-colors">
              <td className="px-3 py-2"><Link href={`/admin/leads/${l.id}`} className="text-gold-light hover:text-gold transition-colors">{l.name}</Link></td>
              <td className="px-3 py-2 text-stone text-xs">{l.email ?? l.phone ?? '—'}</td>
              <td className="px-3 py-2 text-xs text-ivory/80">{sourceChannelLabel(l.sourceChannel as LeadSourceChannel)}{l.sourceReferrer ? ` · ${l.sourceReferrer}` : ''}</td>
              <td className="px-3 py-2 text-xs text-ivory/80">{statusLabel(l.status as LeadStatus)}</td>
              <td className="px-3 py-2 text-xs text-ivory/80">{l._count.notes}</td>
              <td className="px-3 py-2 text-xs text-stone">{Math.floor((Date.now() - l.createdAt.getTime()) / 86_400_000)}d</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
