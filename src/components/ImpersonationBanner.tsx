import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ImpersonationBannerClient } from '@/components/ImpersonationBannerClient'

/**
 * Server component — renders nothing when not impersonating. When the
 * session has an `impersonator` set, fetches the admin's email for display
 * and hands off to a small client component for the "Exit" button.
 */
export async function ImpersonationBanner() {
  const session = await auth()
  const impersonator = session?.user?.impersonator
  if (!impersonator || !session?.user) return null

  const admin = await prisma.user.findUnique({
    where: { id: impersonator },
    select: { email: true },
  })

  return (
    <ImpersonationBannerClient
      adminEmail={admin?.email ?? 'admin'}
      targetEmail={session.user.email ?? 'investor'}
      targetUserId={session.user.id}
      mode={session.user.impersonationMode ?? 'read'}
    />
  )
}
