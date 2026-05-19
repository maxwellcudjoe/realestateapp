'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

const FIELD = 'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

type RequestType = 'UPGRADE' | 'CHANGE_MONTHLY' | 'CHANGE_ANNUAL' | 'CANCEL'

interface Props {
  /** Filters the available request types — investor on FREE tier shouldn't see CANCEL etc. */
  allowedTypes: RequestType[]
}

const TYPE_LABEL: Record<RequestType, string> = {
  UPGRADE: 'Upgrade to Premium',
  CHANGE_MONTHLY: 'Switch to Monthly billing',
  CHANGE_ANNUAL: 'Switch to Annual billing',
  CANCEL: 'Cancel my subscription',
}

export function SubscriptionRequestForm({ allowedTypes }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<RequestType>(allowedTypes[0])
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSubmitting(true)
    try {
      const res = await fetch('/api/portal/subscription/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, reason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Failed')
      } else {
        setDone(true)
        setReason('')
        // Refresh after a short delay so the user sees the confirmation
        setTimeout(() => { router.refresh() }, 1200)
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="border border-gold/60 bg-gold/5 p-4">
        <p className="font-sans text-sm text-ivory">
          Request sent. We&rsquo;ll be in touch shortly to confirm next steps.
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        Request a change
      </Button>
    )
  }

  return (
    <form onSubmit={submit} className="border border-carbon p-5 space-y-4">
      <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">Subscription request</p>
      <div>
        <label className={LABEL}>What would you like?</label>
        <select className={FIELD} value={type} onChange={(e) => setType(e.target.value as RequestType)}>
          {allowedTypes.map((t) => (
            <option key={t} value={t}>{TYPE_LABEL[t]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={LABEL}>Reason (optional)</label>
        <textarea
          rows={3}
          maxLength={2000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={FIELD}
          placeholder="e.g. Want to switch to annual to save · or context for cancellation"
        />
      </div>
      {error && <p className="font-sans text-xs text-red-400">{error}</p>}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send request'}
        </Button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError('') }}
          disabled={submitting}
          className="font-sans text-xs uppercase tracking-widest text-stone hover:text-ivory transition-colors"
        >
          Cancel
        </button>
      </div>
      <p className="font-sans text-[0.6rem] text-stone leading-relaxed">
        Your request goes straight to your account manager. They&rsquo;ll confirm by message + email and then make the change.
      </p>
    </form>
  )
}
