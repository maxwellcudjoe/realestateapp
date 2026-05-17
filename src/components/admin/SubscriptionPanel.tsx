'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { BILLING_PERIODS, BILLING_PERIOD_LABEL, type BillingPeriod } from '@/lib/subscriptions'

const FIELD = 'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

interface Props {
  userId: string
  tier: 'FREE' | 'PREMIUM'
  subscription: {
    billingPeriod: string
    amount: number
    startedAt: string
    cancelledAt: string | null
    nextRenewalAt: string
  } | null
  defaultMonthly: number
  defaultAnnual: number
}

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export function SubscriptionPanel({ userId, tier, subscription, defaultMonthly, defaultAnnual }: Props) {
  const router = useRouter()
  const [showActivate, setShowActivate] = useState(false)
  const [period, setPeriod] = useState<BillingPeriod>('MONTHLY')
  const [amount, setAmount] = useState<string>(String(defaultMonthly))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function switchPeriod(p: BillingPeriod) {
    setPeriod(p)
    setAmount(String(p === 'ANNUAL' ? defaultAnnual : defaultMonthly))
  }

  async function activate(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingPeriod: period, amount: Number(amount) }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setError(json.error ?? 'Failed')
      else { setShowActivate(false); router.refresh() }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  async function cancel() {
    if (!confirm('Cancel this subscription? The user reverts to FREE immediately.')) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/${userId}`, { method: 'DELETE' })
      if (res.ok) router.refresh()
      else {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? 'Failed to cancel')
      }
    } finally { setSubmitting(false) }
  }

  return (
    <div className="border border-carbon p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">Subscription</h3>
        <span className={`font-sans text-[0.6rem] uppercase tracking-widest px-2 py-1 ${tier === 'PREMIUM' ? 'text-gold border border-gold/50' : 'text-stone border border-carbon'}`}>
          {tier}
        </span>
      </div>

      {subscription ? (
        <div className="space-y-2 mb-4">
          <p className="font-sans text-sm text-ivory">
            {fmt(subscription.amount)} {BILLING_PERIOD_LABEL[subscription.billingPeriod as BillingPeriod].toLowerCase()}
          </p>
          <p className="font-sans text-xs text-stone">
            Started {fmtDate(subscription.startedAt)} · {subscription.cancelledAt ? `Cancelled ${fmtDate(subscription.cancelledAt)} — access until ${fmtDate(subscription.nextRenewalAt)}` : `Next renewal ${fmtDate(subscription.nextRenewalAt)}`}
          </p>
        </div>
      ) : (
        <p className="font-sans text-xs text-stone mb-4">No active subscription.</p>
      )}

      {!showActivate && tier === 'FREE' && (
        <Button type="button" onClick={() => setShowActivate(true)}>Activate Premium</Button>
      )}

      {!showActivate && tier === 'PREMIUM' && !subscription?.cancelledAt && (
        <div className="flex items-center gap-4">
          <button onClick={() => setShowActivate(true)} className="font-sans text-[0.6rem] uppercase tracking-widest text-gold hover:text-ivory transition-colors">
            Change plan
          </button>
          <button onClick={cancel} disabled={submitting} className="font-sans text-[0.6rem] uppercase tracking-widest text-stone hover:text-red-400 transition-colors disabled:opacity-50">
            Cancel subscription
          </button>
        </div>
      )}

      {showActivate && (
        <form onSubmit={activate} className="space-y-4 mt-4 pt-4 border-t border-carbon">
          <div className="grid grid-cols-2 gap-3">
            {BILLING_PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => switchPeriod(p)}
                className={`px-4 py-3 font-sans text-xs uppercase tracking-widest transition-colors ${period === p ? 'border border-gold bg-gold/10 text-ivory' : 'border border-carbon text-stone hover:border-gold/40'}`}
              >
                {BILLING_PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
          <div>
            <label className={LABEL}>Amount (£)</label>
            <input type="number" min="1" step="0.01" required className={FIELD} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          {error && <p className="font-sans text-xs text-red-400">{error}</p>}
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={submitting || !amount}>
              {submitting ? 'Activating…' : 'Activate'}
            </Button>
            <button type="button" onClick={() => { setShowActivate(false); setError('') }} className="font-sans text-xs uppercase tracking-widest text-stone hover:text-ivory transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
