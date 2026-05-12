import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Unauthenticated → redirect to login with callback
  if (!session?.user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Non-admin trying to access /admin → redirect to investor portal
  if (pathname.startsWith('/admin') && session.user.role !== 'admin') {
    return NextResponse.redirect(new URL('/portal/status', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/portal/:path*', '/admin/:path*'],
}
