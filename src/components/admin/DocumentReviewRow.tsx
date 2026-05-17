'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: 'Pending review', cls: 'text-stone border-carbon' },
  APPROVED: { label: 'Approved',       cls: 'text-gold border-gold/30 bg-gold/5' },
  REJECTED: { label: 'Rejected',       cls: 'text-red-400 border-red-400/30 bg-red-400/5' },
}

interface Props {
  docId: string
  type: string
  fileName: string
  reviewStatus: string
  reviewNote: string | null
  reviewedAt: string | null
  expiresAt: string | null
}

export function DocumentReviewRow({ docId, type, fileName, reviewStatus, reviewNote, reviewedAt, expiresAt }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState(reviewNote ?? '')
  const [exp, setExp] = useState(expiresAt?.slice(0, 10) ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const status = STATUS_LABEL[reviewStatus] ?? STATUS_LABEL.PENDING
  const expDate = expiresAt ? new Date(expiresAt) : null
  const now = Date.now()
  const SOON_MS = 30 * 24 * 60 * 60 * 1000
  const expSoon = expDate && expDate.getTime() - now < SOON_MS
  const expired = expDate && expDate.getTime() < now

  async function decide(reviewStatus: 'APPROVED' | 'REJECTED') {
    setSubmitting(true); setError('')
    try {
      const res = await fetch(`/api/admin/documents/${docId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewStatus, reviewNote: note || undefined, expiresAt: exp || undefined }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setError(json.error ?? 'Failed')
      else {
        setOpen(false)
        router.refresh()
      }
    } catch { setError('Network error') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="border-b border-carbon/50 pb-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-sans text-xs text-ivory">{type.replace(/_/g, ' ')}</p>
          <p className="font-sans text-[0.55rem] text-stone truncate">{fileName}</p>
          {expDate && (
            <p className={`font-sans text-[0.55rem] mt-0.5 ${expired ? 'text-red-400' : expSoon ? 'text-amber-400' : 'text-stone'}`}>
              {expired ? 'Expired' : 'Expires'} {expDate.toLocaleDateString('en-GB')}
            </p>
          )}
          {reviewNote && (
            <p className="font-sans text-[0.6rem] text-stone italic mt-1">&ldquo;{reviewNote}&rdquo;</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`font-sans text-[0.55rem] uppercase tracking-widest border px-2 py-0.5 ${status.cls}`}>
            {status.label}
          </span>
          {reviewedAt && (
            <span className="font-sans text-[0.5rem] text-stone/60">
              {new Date(reviewedAt).toLocaleDateString('en-GB')}
            </span>
          )}
          <div className="flex gap-3 mt-1">
            <a href={`/api/admin/documents/${docId}/url`} target="_blank" rel="noopener noreferrer"
               className="font-sans text-[0.6rem] uppercase tracking-widest text-gold hover:text-ivory">View</a>
            <button onClick={() => setOpen(!open)} className="font-sans text-[0.6rem] uppercase tracking-widest text-stone hover:text-gold">
              {open ? 'Close' : 'Review'}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="mt-3 p-3 border border-carbon bg-charcoal space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">Note (optional)</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-charcoal border border-carbon px-3 py-2 font-sans text-xs text-ivory focus:outline-none focus:border-gold" placeholder="e.g. Passport expires 2027" />
            </div>
            <div>
              <label className="block font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">Doc expiry (optional)</label>
              <input type="date" value={exp} onChange={(e) => setExp(e.target.value)} className="w-full bg-charcoal border border-carbon px-3 py-2 font-sans text-xs text-ivory focus:outline-none focus:border-gold" />
            </div>
          </div>
          {error && <p className="font-sans text-xs text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => decide('APPROVED')} disabled={submitting} className="px-4 py-2 border border-gold text-gold font-sans text-[0.6rem] uppercase tracking-widest hover:bg-gold hover:text-obsidian transition-colors disabled:opacity-50">
              {submitting ? 'Saving…' : 'Approve'}
            </button>
            <button onClick={() => decide('REJECTED')} disabled={submitting} className="font-sans text-[0.6rem] uppercase tracking-widest text-stone hover:text-red-400 transition-colors disabled:opacity-50">
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
