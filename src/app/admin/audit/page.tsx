import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auditActionLabel } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 100

export default async function AdminAuditPage({ searchParams }: { searchParams: { action?: string; resource?: string; page?: string } }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const action = searchParams.action?.trim() || undefined
  const resource = searchParams.resource?.trim() || undefined
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1)

  const where = {
    ...(action ? { action } : {}),
    ...(resource ? { resourceType: resource } : {}),
  }

  const [events, total] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.auditEvent.count({ where }),
  ])

  // Resolve actor email for display
  const userIds = Array.from(new Set(events.map((e) => e.actorUserId).filter(Boolean) as string[]))
  const users = userIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } })
    : []
  const userById = new Map(users.map((u) => [u.id, u.email]))

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h1 className="font-serif text-4xl font-light text-ivory">Audit Log</h1>
        <Link href="/admin/investors" className="font-sans text-[0.6rem] uppercase tracking-widest text-stone hover:text-gold transition-colors">
          ← Back to investors
        </Link>
      </div>

      <form className="flex flex-wrap gap-3 mb-6">
        <input type="text" name="action" defaultValue={action ?? ''} placeholder="Filter by action (e.g. DEAL_STAGE_CHANGED)"
          className="bg-charcoal border border-carbon px-4 py-2 font-sans text-xs text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors min-w-[280px]" />
        <input type="text" name="resource" defaultValue={resource ?? ''} placeholder="Resource type (Deal / User / Offer)"
          className="bg-charcoal border border-carbon px-4 py-2 font-sans text-xs text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors" />
        <button type="submit" className="px-5 py-2 border border-gold text-gold font-sans text-[0.6rem] uppercase tracking-widest hover:bg-gold hover:text-obsidian transition-colors">
          Filter
        </button>
        {(action || resource) && (
          <Link href="/admin/audit" className="px-5 py-2 border border-carbon text-stone font-sans text-[0.6rem] uppercase tracking-widest hover:border-gold hover:text-gold transition-colors">
            Clear
          </Link>
        )}
      </form>

      <p className="font-sans text-xs text-stone mb-4">
        {total.toLocaleString('en-GB')} event{total === 1 ? '' : 's'}{(action || resource) ? ' (filtered)' : ''} ·
        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
      </p>

      <div className="border border-carbon">
        <table className="w-full">
          <thead>
            <tr className="border-b border-carbon bg-charcoal">
              {['When', 'Actor', 'Action', 'Resource', 'IP'].map((h) => (
                <th key={h} className="text-left font-sans text-[0.55rem] uppercase tracking-widest text-stone/60 p-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan={5} className="p-6 font-sans text-xs text-stone text-center">No events yet.</td></tr>
            ) : events.map((e) => (
              <tr key={e.id} className="border-b border-carbon/50 last:border-b-0 hover:bg-charcoal/40">
                <td className="font-sans text-xs text-ivory p-3 whitespace-nowrap">
                  {e.createdAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="font-sans text-xs text-stone p-3 whitespace-nowrap">
                  {e.actorUserId ? (userById.get(e.actorUserId) ?? e.actorUserId.slice(0, 8)) : 'system'}
                  {e.actorRole && <span className="ml-1 text-[0.55rem] uppercase tracking-widest text-stone/60">({e.actorRole})</span>}
                </td>
                <td className="font-sans text-xs text-ivory p-3">{auditActionLabel(e.action)}</td>
                <td className="font-sans text-xs text-stone p-3">
                  {e.resourceType}{e.resourceId && ` · ${e.resourceId.slice(0, 8)}`}
                  {e.metadata && (
                    <details className="mt-1">
                      <summary className="text-[0.55rem] uppercase tracking-widest text-gold cursor-pointer">metadata</summary>
                      <pre className="text-[0.65rem] text-stone/70 mt-1 whitespace-pre-wrap break-all">{e.metadata}</pre>
                    </details>
                  )}
                </td>
                <td className="font-sans text-xs text-stone/70 p-3 whitespace-nowrap font-mono">{e.ipAddress ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE && (
        <div className="flex gap-3 mt-6">
          {page > 1 && (
            <Link href={`/admin/audit?page=${page - 1}${action ? `&action=${action}` : ''}${resource ? `&resource=${resource}` : ''}`} className="font-sans text-xs uppercase tracking-widest text-gold hover:text-ivory">← Prev</Link>
          )}
          {page * PAGE_SIZE < total && (
            <Link href={`/admin/audit?page=${page + 1}${action ? `&action=${action}` : ''}${resource ? `&resource=${resource}` : ''}`} className="font-sans text-xs uppercase tracking-widest text-gold hover:text-ivory">Next →</Link>
          )}
        </div>
      )}
    </div>
  )
}
