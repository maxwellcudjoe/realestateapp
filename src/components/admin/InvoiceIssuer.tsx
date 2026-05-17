'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { INVOICE_TYPES, INVOICE_TYPE_LABELS, type InvoiceType } from '@/lib/invoices'

const FIELD = 'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

interface Props {
  userId: string
  /** Pre-fill deal context (deal detail page). */
  dealId?: string
  /** Pre-fill the type + amount (success-fee on COMPLETED, sourcing on accept). */
  defaultType?: InvoiceType
  defaultAmount?: number
  defaultDescription?: string
  /** Label shown on the trigger button. */
  triggerLabel?: string
}

export function InvoiceIssuer({ userId, dealId, defaultType = 'SOURCING', defaultAmount = 0, defaultDescription = '', triggerLabel = 'Issue invoice' }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<InvoiceType>(defaultType)
  const [amount, setAmount] = useState<string>(defaultAmount ? String(defaultAmount) : '')
  const [description, setDescription] = useState(defaultDescription)
  const [dueAt, setDueAt] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSubmitting(true)
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          dealId: dealId ?? null,
          type,
          amount: Number(amount),
          description,
          dueAt: dueAt || undefined,
          sendNow: true,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Failed')
      } else {
        setOpen(false)
        router.refresh()
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>{triggerLabel}</Button>
    )
  }

  return (
    <form onSubmit={submit} className="border border-gold p-5 bg-obsidian space-y-4">
      <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">Issue invoice (sends immediately)</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Type</label>
          <select className={FIELD} value={type} onChange={(e) => setType(e.target.value as InvoiceType)}>
            {INVOICE_TYPES.map((t) => <option key={t} value={t}>{INVOICE_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Amount (£)</label>
          <input type="number" min="0.01" step="0.01" required className={FIELD} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
      <div>
        <label className={LABEL}>Description</label>
        <input type="text" required maxLength={500} className={FIELD} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Success fee — 12 High St" />
      </div>
      <div>
        <label className={LABEL}>Due date (optional — defaults to 14 days)</label>
        <input type="date" className={FIELD} value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
      </div>
      {error && <p className="font-sans text-xs text-red-400">{error}</p>}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={submitting || !amount || !description}>
          {submitting ? 'Sending…' : 'Issue & send invoice'}
        </Button>
        <button type="button" onClick={() => setOpen(false)} disabled={submitting} className="font-sans text-xs uppercase tracking-widest text-stone hover:text-ivory transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}
