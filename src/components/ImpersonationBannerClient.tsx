'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  adminEmail: string
  targetEmail: string
  targetUserId: string
  mode: 'read' | 'write'
}

export function ImpersonationBannerClient({ adminEmail, targetEmail, targetUserId, mode }: Props) {
  const router = useRouter()
  const [exiting, setExiting] = useState(false)

  async function exit() {
    setExiting(true)
    try {
      await fetch(`/api/admin/users/${targetUserId}/impersonate`, { method: 'DELETE' })
      router.push(`/admin/investors`)
      router.refresh()
    } catch {
      setExiting(false)
    }
  }

  const isWrite = mode === 'write'
  const containerClass = isWrite
    ? 'bg-red-600/30 border-y-2 border-red-500'
    : 'bg-red-500/15 border-y border-red-500/40'
  const labelClass = isWrite ? 'text-red-100' : 'text-red-200'
  const detailClass = isWrite ? 'text-red-100' : 'text-red-300/80'
  const buttonClass = isWrite
    ? 'px-3 py-1 border-2 border-red-300 text-red-50 font-sans text-[0.6rem] uppercase tracking-widest hover:bg-red-300 hover:text-obsidian transition-colors disabled:opacity-50 font-semibold'
    : 'px-3 py-1 border border-red-400 text-red-200 font-sans text-[0.6rem] uppercase tracking-widest hover:bg-red-500 hover:text-obsidian transition-colors disabled:opacity-50'

  return (
    <div className={`sticky top-[72px] z-40 px-4 py-2 ${containerClass}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <p className={`font-sans text-xs ${labelClass}`}>
          {isWrite ? '⚠⚠ ' : '⚠ '}
          {isWrite ? <strong>WRITE-MODE</strong> : 'Impersonating'} <strong className={isWrite ? 'underline' : ''}>{targetEmail}</strong> as {adminEmail}
          <span className={`ml-1 ${detailClass}`}>
            · {isWrite
              ? 'every action is recorded against your admin id'
              : 'read-only — writes are blocked'}
          </span>
        </p>
        <button
          onClick={exit}
          disabled={exiting}
          className={buttonClass}
        >
          {exiting ? 'Ending…' : 'Exit impersonation'}
        </button>
      </div>
    </div>
  )
}
