'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  applicationId: string
  kycExpiresAt: string | null
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function isExpiringSoon(iso: string | null): boolean {
  if (!iso) return true   // never set — re-check is OK to launch
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return true
  return ms - Date.now() <= THIRTY_DAYS_MS
}

export function KycRecheckButton({ applicationId, kycExpiresAt }: Props) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  if (!isExpiringSoon(kycExpiresAt)) return null

  async function launch() {
    if (!confirm('Launch KYC re-check? Investor will be emailed asking to refresh their documents.')) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/kyc-recheck`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Failed')
        return
      }
      setMessage(`Re-check launched · provider: ${json.provider}`)
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-3 flex items-center gap-3">
      <button
        onClick={launch}
        disabled={submitting}
        className="px-3 py-1 border border-amber-400 text-amber-400 font-sans text-[0.55rem] uppercase tracking-widest hover:bg-amber-400 hover:text-obsidian transition-colors disabled:opacity-50"
      >
        {submitting ? 'Launching…' : 'Launch KYC re-check'}
      </button>
      {message && <span className="font-sans text-xs text-gold">{message}</span>}
      {error && <span className="font-sans text-xs text-red-400">{error}</span>}
    </div>
  )
}
