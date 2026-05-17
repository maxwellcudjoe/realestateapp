'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

const FIELD = 'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

interface Props {
  dealId: string
  pending: boolean
}

export function OfferDecisionPanel({ dealId, pending }: Props) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!pending) return null

  async function decide(decision: 'ACCEPTED' | 'REJECTED') {
    setError(''); setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/deals/${dealId}/offer-decision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, vendorDecisionNote: note || undefined }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setError(json.error ?? 'Failed')
      else router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-carbon space-y-3">
      <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Record Vendor Decision</p>
      <div>
        <label className={LABEL}>Note (optional)</label>
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={FIELD} placeholder="e.g. Vendor accepted at £245k pending survey" />
      </div>
      {error && <p className="font-sans text-xs text-red-400">{error}</p>}
      <div className="flex gap-3">
        <Button type="button" onClick={() => decide('ACCEPTED')} disabled={submitting}>
          {submitting ? 'Saving…' : 'Vendor Accepted'}
        </Button>
        <button
          type="button"
          onClick={() => decide('REJECTED')}
          disabled={submitting}
          className="font-sans text-xs uppercase tracking-widest text-stone hover:text-red-400 transition-colors disabled:opacity-50"
        >
          Vendor Declined
        </button>
      </div>
    </div>
  )
}
