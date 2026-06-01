'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

const STORAGE_KEY = 'portal.welcome-dismissed'

/**
 * One-time banner shown to magic-link converted leads landing on the portal
 * dashboard with `?welcome=1`. Encourages them to complete their profile
 * (the lead-to-investor conversion only seeds placeholder address/buyer-type
 * fields — they need to fill the real values).
 *
 * Dismissal sticks via localStorage AND strips the query param so a refresh
 * doesn't briefly re-show the banner before the effect resolves.
 */
export function WelcomeBanner() {
  const router = useRouter()
  const params = useSearchParams()
  // Start hidden to avoid SSR/CSR hydration flash; useEffect resolves real state.
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (params.get('welcome') === '1' && localStorage.getItem(STORAGE_KEY) !== 'true') {
      setShow(true)
    }
  }, [params])

  if (!show) return null

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, 'true')
    setShow(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('welcome')
    router.replace(url.pathname + (url.search || ''))
  }

  return (
    <aside className="border-l-4 border-emerald-400 bg-emerald-50 p-4 text-sm space-y-2 mb-8">
      <header className="flex items-center justify-between gap-3">
        <strong className="text-emerald-900">Welcome to Rêve Bâtir.</strong>
        <button
          onClick={dismiss}
          className="text-emerald-900 underline text-xs flex-shrink-0"
        >
          Dismiss
        </button>
      </header>
      <p className="text-emerald-900/90">
        We&apos;ve remembered the preferences you discussed with the team. Take a moment to
        complete your profile — address, mortgage details, source of funds — at{' '}
        <Link href="/portal/profile" className="text-emerald-700 underline font-medium">
          your profile page
        </Link>
        .
      </p>
    </aside>
  )
}
