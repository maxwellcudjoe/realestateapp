import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  mapLoginAttempt, mapAudit, mapMessage, mapViewing, mapFavourite, mergeActivity,
  ACTIVITY_KIND_LABEL, type ActivityKind,
} from '@/lib/user-activity'
import { auditActionLabel } from '@/lib/audit'

export const dynamic = 'force-dynamic'

const ALL_KINDS: ActivityKind[] = ['LOGIN', 'AUDIT', 'MESSAGE', 'VIEWING', 'FAVOURITE']
const PAGE_SIZE = 100

export default async function AdminInvestorActivityPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { kinds?: string }
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      investorProfile: { select: { user: { select: { id: true } } } },
    },
  })
  if (!application) redirect('/admin/investors')

  const userId = application.investorProfile.user.id
  const applicationId = application.id

  const requestedKinds = searchParams.kinds
    ? new Set(searchParams.kinds.split(',').filter((k): k is ActivityKind => (ALL_KINDS as string[]).includes(k)))
    : new Set<ActivityKind>(ALL_KINDS)

  const [logins, audits, messages, viewings, dealFavs, contentfulFavs] = await Promise.all([
    requestedKinds.has('LOGIN')
      ? prisma.loginAttempt.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: PAGE_SIZE,
        })
      : Promise.resolve([]),
    requestedKinds.has('AUDIT')
      ? prisma.auditEvent.findMany({
          where: { OR: [{ actorUserId: userId }, { resourceId: userId }] },
          orderBy: { createdAt: 'desc' },
          take: PAGE_SIZE,
        })
      : Promise.resolve([]),
    requestedKinds.has('MESSAGE')
      ? prisma.message.findMany({
          where: { senderUserId: userId },
          orderBy: { createdAt: 'desc' },
          take: PAGE_SIZE,
        })
      : Promise.resolve([]),
    requestedKinds.has('VIEWING')
      ? prisma.viewing.findMany({
          where: { investorUserId: userId },
          orderBy: { createdAt: 'desc' },
          take: PAGE_SIZE,
        })
      : Promise.resolve([]),
    requestedKinds.has('FAVOURITE')
      ? prisma.dealFavourite.findMany({
          where: { userId },
          include: { deal: { select: { title: true, address: true, id: true } } },
          orderBy: { createdAt: 'desc' },
          take: PAGE_SIZE,
        })
      : Promise.resolve([]),
    requestedKinds.has('FAVOURITE')
      ? prisma.contentfulDealInterest.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: PAGE_SIZE,
        })
      : Promise.resolve([]),
  ])

  const profileHref = `/admin/investors/${applicationId}`

  const events = [
    ...logins.map(mapLoginAttempt),
    ...audits.map((a) => mapAudit(a, auditActionLabel)),
    ...messages.map((m) => mapMessage(m, profileHref)),
    ...viewings.map(mapViewing),
    ...dealFavs.map((f) =>
      mapFavourite({
        id: f.id,
        source: 'DEAL',
        label: f.deal?.title ? `${f.deal.title} — ${f.deal.address}` : '(deal removed)',
        href: f.deal ? `/admin/investors/${applicationId}/deals/${f.deal.id}` : null,
        createdAt: f.createdAt,
      }),
    ),
    ...contentfulFavs.map((f) =>
      mapFavourite({
        id: f.id,
        source: 'CONTENTFUL',
        label: f.title ?? f.contentfulEntryId,
        href: f.slug ? `/deals/${f.slug}` : null,
        createdAt: f.createdAt,
      }),
    ),
  ]
  const feed = mergeActivity(events, requestedKinds)

  return (
    <div>
      <p className="font-sans text-xs text-stone mb-6">{feed.length} event{feed.length === 1 ? '' : 's'}</p>

      <form className="flex flex-wrap gap-2 mb-6">
        {ALL_KINDS.map((k) => {
          const next = new Set(requestedKinds)
          if (next.has(k)) next.delete(k)
          else next.add(k)
          const nextQs = next.size === 0 || next.size === ALL_KINDS.length
            ? ''
            : `?kinds=${Array.from(next).join(',')}`
          const active = requestedKinds.has(k)
          return (
            <Link
              key={k}
              href={`/admin/investors/${applicationId}/activity${nextQs}`}
              className={`px-3 py-1 font-sans text-[0.55rem] uppercase tracking-widest border transition-colors ${
                active
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-carbon text-stone hover:border-gold hover:text-gold'
              }`}
            >
              {ACTIVITY_KIND_LABEL[k]}
            </Link>
          )
        })}
      </form>

      {feed.length === 0 ? (
        <p className="font-sans text-sm text-stone">No activity yet.</p>
      ) : (
        <div className="border border-carbon">
          {feed.map((e) => (
            <div key={e.id} className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-carbon/60 last:border-b-0 items-start">
              <div className="col-span-2">
                <span className={`font-sans text-[0.55rem] uppercase tracking-widest px-2 py-0.5 border ${kindClass(e.kind)}`}>
                  {ACTIVITY_KIND_LABEL[e.kind]}
                </span>
              </div>
              <div className="col-span-7">
                <p className="font-sans text-sm text-ivory">{e.title}</p>
                {e.detail && <p className="font-sans text-xs text-stone mt-0.5">{e.detail}</p>}
              </div>
              <div className="col-span-3 text-right">
                <p className="font-sans text-[0.65rem] text-stone whitespace-nowrap">
                  {e.when.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
                {e.href && (
                  <Link href={e.href} className="font-sans text-[0.55rem] uppercase tracking-widest text-gold hover:text-ivory transition-colors">
                    Open →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {feed.length === PAGE_SIZE && (
        <p className="font-sans text-xs text-stone mt-4">
          Showing first {PAGE_SIZE} events per kind. Older events available via the audit log.
        </p>
      )}
    </div>
  )
}

function kindClass(kind: ActivityKind): string {
  switch (kind) {
    case 'LOGIN': return 'text-stone border-carbon'
    case 'AUDIT': return 'text-gold border-gold/40 bg-gold/5'
    case 'MESSAGE': return 'text-ivory border-ivory/30'
    case 'VIEWING': return 'text-amber-400 border-amber-400/40'
    case 'FAVOURITE': return 'text-gold border-gold/30'
  }
}
