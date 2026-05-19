'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

const FIELD = 'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

export interface OfferData {
  amount: number
  depositPercent: number
  financingSource: string
  targetExchangeDate: string | null
  conditions: string | null
  status: string
  vendorDecisionNote: string | null
  submittedAt: string
}

interface Props {
  dealId: string
  askingPrice: number
  existingOffer: OfferData | null
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending vendor decision',
  ACCEPTED: 'Accepted by vendor',
  REJECTED: 'Declined by vendor',
  WITHDRAWN: 'Withdrawn',
}

export function OfferForm({ dealId, askingPrice, existingOffer }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(!existingOffer)
  const [confirmWithdraw, setConfirmWithdraw] = useState(false)

  const [amount, setAmount] = useState(existingOffer?.amount ?? askingPrice)
  const [depositPercent, setDepositPercent] = useState(existingOffer?.depositPercent ?? 25)
  const [financingSource, setFinancingSource] = useState(existingOffer?.financingSource ?? 'MORTGAGE')
  const [targetExchangeDate, setTargetExchangeDate] = useState(existingOffer?.targetExchangeDate?.slice(0, 10) ?? '')
  const [conditions, setConditions] = useState(existingOffer?.conditions ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // C8 — an existing REJECTED/WITHDRAWN offer is replaceable via POST (the API
  // archives the prior offer and creates a new one). Only PENDING uses PATCH.
  const isUpdatable = existingOffer?.status === 'PENDING'
  const isReplaceable = existingOffer && !isUpdatable && existingOffer.status !== 'ACCEPTED'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSubmitting(true)
    try {
      const res = await fetch(`/api/portal/deals/${dealId}/offer`, {
        method: isUpdatable ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, depositPercent, financingSource, targetExchangeDate, conditions }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setError(json.error ?? 'Failed')
      else {
        setEditing(false)
        router.refresh()
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  async function withdraw() {
    setError(''); setSubmitting(true)
    try {
      const res = await fetch(`/api/portal/deals/${dealId}/offer`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setError(json.error ?? 'Failed')
      else {
        setConfirmWithdraw(false)
        router.refresh()
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const fmt = (n: number) => `£${Number(n).toLocaleString('en-GB')}`
  const depositAmount = Math.round((amount * depositPercent) / 100)
  const balance = amount - depositAmount

  // Locked-state display when offer is ACCEPTED — no more changes possible.
  if (existingOffer && existingOffer.status === 'ACCEPTED') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-sans text-sm text-ivory">{fmt(existingOffer.amount)}</p>
          <span className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">
            {STATUS_LABEL[existingOffer.status]}
          </span>
        </div>
        <p className="font-sans text-xs text-stone">
          Submitted {new Date(existingOffer.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' · '}{existingOffer.depositPercent}% deposit · {existingOffer.financingSource.toLowerCase()}
        </p>
        {existingOffer.vendorDecisionNote && (
          <p className="font-sans text-xs text-stone italic border-l-2 border-gold/30 pl-3">
            &ldquo;{existingOffer.vendorDecisionNote}&rdquo;
          </p>
        )}
      </div>
    )
  }

  // C8 — REJECTED/WITHDRAWN: show prior offer summary + invite a revised offer.
  // The form replaces the prior via POST (server archives the old one).
  if (isReplaceable && !editing) {
    return (
      <div className="space-y-4">
        <div className="border-l-2 border-stone/40 pl-4 py-1 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-sans text-sm text-stone">{fmt(existingOffer.amount)}</p>
            <span className={`font-sans text-[0.6rem] uppercase tracking-widest ${existingOffer.status === 'REJECTED' ? 'text-red-400' : 'text-stone'}`}>
              Previous: {STATUS_LABEL[existingOffer.status]}
            </span>
          </div>
          <p className="font-sans text-[0.65rem] text-stone">
            Submitted {new Date(existingOffer.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' · '}{existingOffer.depositPercent}% deposit · {existingOffer.financingSource.toLowerCase()}
          </p>
          {existingOffer.vendorDecisionNote && (
            <p className="font-sans text-xs text-stone italic">
              Vendor: &ldquo;{existingOffer.vendorDecisionNote}&rdquo;
            </p>
          )}
        </div>
        <Button type="button" onClick={() => setEditing(true)}>
          Submit revised offer
        </Button>
      </div>
    )
  }

  if (existingOffer && !editing && !confirmWithdraw) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-sans text-sm text-ivory">{fmt(existingOffer.amount)}</p>
          <span className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">
            {STATUS_LABEL[existingOffer.status]}
          </span>
        </div>
        <p className="font-sans text-xs text-stone">
          Submitted {new Date(existingOffer.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' · '}{existingOffer.depositPercent}% deposit · {existingOffer.financingSource.toLowerCase()}
          {existingOffer.targetExchangeDate && <> · Target exchange {new Date(existingOffer.targetExchangeDate).toLocaleDateString('en-GB')}</>}
        </p>
        {existingOffer.conditions && (
          <p className="font-sans text-xs text-stone italic border-l-2 border-gold/30 pl-3 whitespace-pre-line">
            {existingOffer.conditions}
          </p>
        )}
        <div className="flex gap-4 pt-1">
          <button onClick={() => setEditing(true)} className="font-sans text-xs uppercase tracking-widest text-gold hover:text-ivory transition-colors">Edit</button>
          <button onClick={() => setConfirmWithdraw(true)} className="font-sans text-xs uppercase tracking-widest text-stone hover:text-red-400 transition-colors">Withdraw</button>
        </div>
      </div>
    )
  }

  if (confirmWithdraw) {
    return (
      <div className="space-y-3">
        <p className="font-sans text-xs text-stone">Withdraw this offer? You can submit a new one if you change your mind.</p>
        {error && <p className="font-sans text-xs text-red-400">{error}</p>}
        <div className="flex gap-4">
          <button onClick={withdraw} disabled={submitting} className="font-sans text-xs uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors disabled:opacity-50">
            {submitting ? 'Withdrawing…' : 'Confirm Withdraw'}
          </button>
          <button onClick={() => { setConfirmWithdraw(false); setError('') }} disabled={submitting} className="font-sans text-xs uppercase tracking-widest text-stone hover:text-ivory transition-colors">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={LABEL}>Offer amount (£)</label>
          <input type="number" required min={1} max={1_000_000_000} value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Deposit (%)</label>
          <input type="number" required min={0} max={100} value={depositPercent || ''} onChange={(e) => setDepositPercent(Number(e.target.value))} className={FIELD} />
          <p className="font-sans text-[0.6rem] text-stone mt-1">
            Deposit {fmt(depositAmount)} · Balance {fmt(balance)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={LABEL}>Financing</label>
          <select value={financingSource} onChange={(e) => setFinancingSource(e.target.value)} className={FIELD}>
            <option value="CASH">Cash</option>
            <option value="MORTGAGE">Mortgage</option>
            <option value="MIXED">Mixed (cash + mortgage)</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Target exchange date (optional)</label>
          <input type="date" value={targetExchangeDate} onChange={(e) => setTargetExchangeDate(e.target.value)} className={FIELD} />
        </div>
      </div>
      <div>
        <label className={LABEL}>Conditions (optional)</label>
        <textarea rows={3} value={conditions} onChange={(e) => setConditions(e.target.value)} className={FIELD} placeholder="e.g. Subject to satisfactory survey&#10;Subject to mortgage offer" />
      </div>
      {error && <p className="font-sans text-xs text-red-400">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={submitting || !amount || depositPercent < 0}>
          {submitting
            ? 'Saving…'
            : isUpdatable
              ? 'Update Offer'
              : isReplaceable
                ? 'Submit Revised Offer'
                : 'Submit Offer'}
        </Button>
        {existingOffer && (
          <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={submitting}>Cancel</Button>
        )}
      </div>
    </form>
  )
}
