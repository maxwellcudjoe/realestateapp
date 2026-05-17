import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { notificationTypeLabel } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export default async function PortalNotificationsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  // Mark all as read on page view
  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  })

  return (
    <div>
      <h1 className="font-serif text-4xl font-light text-ivory mb-2">Notifications</h1>
      <p className="font-sans text-sm text-stone mb-10">
        Updates from your investor portal. Most recent first; older than 100 entries are pruned.
      </p>

      {notifications.length === 0 ? (
        <div className="border border-carbon p-8 text-center">
          <p className="font-sans text-sm text-stone">No notifications yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => {
            const isNew = !n.readAt
            return (
              <li key={n.id}>
                <Link href={n.link ?? '#'} className={`block border p-4 transition-colors ${isNew ? 'border-gold bg-gold/5 hover:bg-gold/10' : 'border-carbon hover:border-gold/40'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-sans text-[0.55rem] uppercase tracking-widest text-gold">
                        {notificationTypeLabel(n.type)}
                      </p>
                      <p className="font-sans text-sm text-ivory mt-1">{n.title}</p>
                      {n.body && <p className="font-sans text-xs text-stone mt-1 leading-relaxed">{n.body}</p>}
                    </div>
                    <p className="font-sans text-[0.55rem] text-stone whitespace-nowrap">
                      {n.createdAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
