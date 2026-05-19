'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  adminEmail: string
  targetEmail: string
  targetUserId: string
}

export function ImpersonationBannerClient({ adminEmail, targetEmail, targetUserId }: Props) {
  const router = useRouter()
  const [exiting, setExiting] = useState(false)

  async function exit() {
    setExiting(true)
    try {
      await fetch(`/api/admin/users/${targetUserId}/impersonate`, { method: 'DELETE' })
      // After clearing the cookie, send the admin back to the investor profile.
      router.push(`/admin/investors`)
      router.refresh()
    } catch {
      setExiting(false)
    }
  }

  return (
    <div className="sticky top-[72px] z-40 bg-red-500/15 border-y border-red-500/40 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <p className="font-sans text-xs text-red-200">
          ⚠ Impersonating <strong className="text-red-100">{targetEmail}</strong> as {adminEmail} ·
          <span className="text-red-300/80 ml-1">read-only — writes are blocked</span>
        </p>
        <button
          onClick={exit}
          disabled={exiting}
          className="px-3 py-1 border border-red-400 text-red-200 font-sans text-[0.6rem] uppercase tracking-widest hover:bg-red-500 hover:text-obsidian transition-colors disabled:opacity-50"
        >
          {exiting ? 'Ending…' : 'Exit impersonation'}
        </button>
      </div>
    </div>
  )
}
