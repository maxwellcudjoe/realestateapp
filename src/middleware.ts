import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextResponse } from 'next/server'
import {
  IMPERSONATE_COOKIE,
  IMPERSONATE_TTL_MS,
  verifyImpersonateCookie,
  isBlockedDuringImpersonation,
  maybeRefreshImpersonateCookie,
} from '@/lib/impersonate'

const { auth } = NextAuth(authConfig)

export default auth(async (req) => {
  const { pathname } = req.nextUrl
  const session = req.auth
  const isApi = pathname.startsWith('/api/')

  // PR I — impersonation handling. Verify cookie once, then (a) reject API
  // mutations with 403, and (b) refresh the cookie via sliding window when
  // remaining TTL drops below the threshold (capped at the 4-hour absolute
  // session age). All redirect/next responses below honour the refreshed
  // cookie via `attachRefresh()`.
  const secret = process.env.NEXTAUTH_SECRET
  const cookieValue = secret ? req.cookies.get(IMPERSONATE_COOKIE)?.value : undefined
  const impersonatePayload = secret && cookieValue
    ? await verifyImpersonateCookie(secret, cookieValue)
    : null
  const refreshed = secret && impersonatePayload
    ? await maybeRefreshImpersonateCookie(secret, impersonatePayload)
    : null

  function attachRefresh(res: NextResponse): NextResponse {
    if (refreshed) {
      res.cookies.set(IMPERSONATE_COOKIE, refreshed.value, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: Math.floor(IMPERSONATE_TTL_MS / 1000),
      })
    }
    return res
  }

  if (
    impersonatePayload &&
    isApi &&
    isBlockedDuringImpersonation(req.method, pathname, impersonatePayload.mode)
  ) {
    return attachRefresh(NextResponse.json(
      { error: 'IMPERSONATION_READ_ONLY', message: 'Writes are blocked while impersonating.' },
      { status: 403 },
    ))
  }

  // For API routes we don't redirect — endpoints return their own 401.
  if (isApi) {
    return attachRefresh(NextResponse.next())
  }

  // Unauthenticated → redirect to login with callback
  if (!session?.user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return attachRefresh(NextResponse.redirect(loginUrl))
  }

  // Non-admin trying to access /admin → redirect to investor portal.
  // An admin who is impersonating an investor will appear non-admin here —
  // bouncing them to /portal is the intended UX (they're now a guest user).
  if (pathname.startsWith('/admin') && session.user.role !== 'admin') {
    return attachRefresh(NextResponse.redirect(new URL('/portal', req.url)))
  }

  return attachRefresh(NextResponse.next())
})

export const config = {
  // Includes /api/portal and /api/admin so the impersonation write-block fires
  // there. Excludes /api/auth (NextAuth's own endpoints) since those must
  // never be intercepted, and excludes other /api roots in case they appear.
  matcher: ['/portal/:path*', '/admin/:path*', '/api/portal/:path*', '/api/admin/:path*'],
}
