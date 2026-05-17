'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'

const FIELD = 'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Awaiting confirmation',
  CONFIRMED: 'Confirmed',
  DECLINED: 'Declined',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

interface Viewing {
  id: string
  requestedSlot: string
  alternativeSlot: string | null
  confirmedSlot: string | null
  status: string
  investorNote: string | null
  adminNote: string | null
  isMine: boolean
}

interface Props {
  dealId: string
  /** When isAdmin=true, render the decision controls; otherwise show investor's request form. */
  isAdmin: boolean
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function ViewingPanel({ dealId, isAdmin }: Props) {
  const [viewings, setViewings] = useState<Viewing[]>([])
  const [loading, setLoading] = useState(true)
  const [requestedSlot, setRequestedSlot] = useState('')
  const [alternativeSlot, setAlternativeSlot] = useState('')
  const [investorNote, setInvestorNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/deals/${dealId}/viewings`)
      const json = await res.json()
      if (res.ok) setViewings(json.viewings ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [dealId])

  useEffect(() => { load() }, [load])

  async function request(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSubmitting(true)
    try {
      const res = await fetch(`/api/portal/deals/${dealId}/viewings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedSlot, alternativeSlot, investorNote }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setError(json.error ?? 'Failed')
      else {
        setRequestedSlot(''); setAlternativeSlot(''); setInvestorNote('')
        await load()
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {loading ? (
        <p className="font-sans text-xs text-stone">Loading…</p>
      ) : viewings.length === 0 ? (
        <p className="font-sans text-xs text-stone">No viewings yet.</p>
      ) : (
        <ul className="space-y-3">
          {viewings.map((v) => (
            <li key={v.id} className={`border-l-2 pl-4 py-2 ${v.status === 'CONFIRMED' ? 'border-gold bg-gold/5' : v.status === 'DECLINED' || v.status === 'CANCELLED' ? 'border-red-400/40' : 'border-carbon'}`}>
              <div className="flex items-center justify-between gap-3 mb-1">
                <p className="font-sans text-sm text-ivory">
                  {v.confirmedSlot ? fmtDate(v.confirmedSlot) : fmtDate(v.requestedSlot)}
                  {v.alternativeSlot && !v.confirmedSlot && (
                    <span className="font-sans text-xs text-stone"> · or {fmtDate(v.alternativeSlot)}</span>
                  )}
                </p>
                <span className={`font-sans text-[0.55rem] uppercase tracking-widest ${v.status === 'CONFIRMED' ? 'text-gold' : 'text-stone'}`}>
                  {STATUS_LABEL[v.status] ?? v.status}
                </span>
              </div>
              {v.investorNote && <p className="font-sans text-xs text-stone italic">&ldquo;{v.investorNote}&rdquo;</p>}
              {v.adminNote && (
                <p className="font-sans text-xs text-gold/80 italic mt-1">Reply: &ldquo;{v.adminNote}&rdquo;</p>
              )}
              {isAdmin && v.status === 'REQUESTED' && <AdminDecide viewingId={v.id} onDone={load} suggested={v.requestedSlot} />}
            </li>
          ))}
        </ul>
      )}

      {!isAdmin && (
        <form onSubmit={request} className="border-t border-carbon pt-5 space-y-4">
          <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">Request a viewing</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Preferred slot</label>
              <input type="datetime-local" required value={requestedSlot} onChange={(e) => setRequestedSlot(e.target.value)} className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Alternative (optional)</label>
              <input type="datetime-local" value={alternativeSlot} onChange={(e) => setAlternativeSlot(e.target.value)} className={FIELD} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Note (optional)</label>
            <textarea rows={2} maxLength={1000} value={investorNote} onChange={(e) => setInvestorNote(e.target.value)} className={FIELD} placeholder="e.g. Weekend evenings work best for me" />
          </div>
          {error && <p className="font-sans text-xs text-red-400">{error}</p>}
          <Button type="submit" disabled={submitting || !requestedSlot}>
            {submitting ? 'Sending…' : 'Request viewing'}
          </Button>
        </form>
      )}
    </div>
  )
}

function AdminDecide({ viewingId, suggested, onDone }: { viewingId: string; suggested: string; onDone: () => void }) {
  const [confirmedSlot, setConfirmedSlot] = useState(suggested.slice(0, 16))
  const [adminNote, setAdminNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function decide(status: 'CONFIRMED' | 'DECLINED') {
    setError(''); setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/viewings/${viewingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, confirmedSlot: status === 'CONFIRMED' ? confirmedSlot : undefined, adminNote }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setError(json.error ?? 'Failed')
      else await onDone()
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-carbon space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Confirm slot</label>
          <input type="datetime-local" value={confirmedSlot} onChange={(e) => setConfirmedSlot(e.target.value)} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Note (optional)</label>
          <input type="text" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className={FIELD} placeholder="e.g. Agent will meet you on site" />
        </div>
      </div>
      {error && <p className="font-sans text-xs text-red-400">{error}</p>}
      <div className="flex gap-3">
        <Button type="button" onClick={() => decide('CONFIRMED')} disabled={submitting || !confirmedSlot}>
          {submitting ? 'Saving…' : 'Confirm'}
        </Button>
        <button type="button" onClick={() => decide('DECLINED')} disabled={submitting} className="font-sans text-xs uppercase tracking-widest text-stone hover:text-red-400 transition-colors disabled:opacity-50">
          Decline
        </button>
      </div>
    </div>
  )
}
