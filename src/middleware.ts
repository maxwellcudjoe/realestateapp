import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextResponse } from 'next/server'
import {
  IMPERSONATE_COOKIE,
  verifyImpersonateCookie,
  isBlockedDuringImpersonation,
} from '@/lib/impersonate'

const { auth } = NextAuth(authConfig)

export default auth(async (req) => {
  const { pathname } = req.nextUrl
  const session = req.auth
  const isApi = pathname.startsWith('/api/')

  // PR I — impersonation read-only enforcement. If a valid impersonate cookie
  // is present and the request is a mutation on /api/*, reject with 403. The
  // session callback (Node) overlays the user identity; middleware (edge) only
  // gates writes. We do not redirect — APIs return JSON 403 so callers see it.
  const secret = process.env.NEXTAUTH_SECRET
  if (secret && isApi) {
    const cookieValue = req.cookies.get(IMPERSONATE_COOKIE)?.value
    if (cookieValue && isBlockedDuringImpersonation(req.method, pathname)) {
      const payload = await verifyImpersonateCookie(secret, cookieValue)
      if (payload) {
        return NextResponse.json(
          { error: 'IMPERSONATION_READ_ONLY', message: 'Writes are blocked while impersonating.' },
          { status: 403 },
        )
      }
    }
  }

  // For API routes we don't redirect — endpoints return their own 401.
  if (isApi) {
    return NextResponse.next()
  }

  // Unauthenticated → redirect to login with callback
  if (!session?.user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Non-admin trying to access /admin → redirect to investor portal.
  // An admin who is impersonating an investor will appear non-admin here —
  // bouncing them to /portal is the intended UX (they're now a guest user).
  if (pathname.startsWith('/admin') && session.user.role !== 'admin') {
    return NextResponse.redirect(new URL('/portal', req.url))
  }

  return NextResponse.next()
})

export const config = {
  // Includes /api/portal and /api/admin so the impersonation write-block fires
  // there. Excludes /api/auth (NextAuth's own endpoints) since those must
  // never be intercepted, and excludes other /api roots in case they appear.
  matcher: ['/portal/:path*', '/admin/:path*', '/api/portal/:path*', '/api/admin/:path*'],
}
