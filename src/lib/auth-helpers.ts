import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export type ActiveSession = {
  user: { id: string; email?: string | null; role: string }
}

/**
 * Returns the current session ONLY if the user record is still active in the
 * database (not soft-deleted). NextAuth's JWT session keeps working even after
 * `User.deletedAt` is set — the token-only check at sign-in time doesn't
 * re-validate on subsequent requests. This helper closes audit finding H1:
 *
 *   - Returns `null` if no session
 *   - Returns `null` if the user has been soft-deleted (or no longer exists)
 *   - Returns the session otherwise
 *
 * Use in every endpoint that allows mutation (POST/PATCH/PUT/DELETE) so that
 * a deleted user's lingering JWT can't keep creating data.
 *
 * Read-only GETs may use plain `auth()` if the lookup overhead matters.
 */
export async function getActiveSession(): Promise<ActiveSession | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { deletedAt: true },
  })
  if (!user || user.deletedAt) return null

  return session as ActiveSession
}
