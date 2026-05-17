'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  invoiceId: string
  invoiceNumber: string
}

export function InvoiceMarkPaid({ invoiceId, invoiceNumber }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID', paidReference: reference }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setError(json.error ?? 'Failed')
      else { setOpen(false); router.refresh() }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  async function voidInvoice() {
    if (!confirm(`Void invoice ${invoiceNumber}? The investor will still see it in their history but it will be marked VOID.`)) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'VOID' }),
      })
      if (res.ok) router.refresh()
      else {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? 'Failed to void')
      }
    } finally { setSubmitting(false) }
  }

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <button onClick={() => setOpen(true)} disabled={submitting} className="font-sans text-[0.6rem] uppercase tracking-widest text-gold hover:text-ivory transition-colors disabled:opacity-50">
          Mark paid
        </button>
        <button onClick={voidInvoice} disabled={submitting} className="font-sans text-[0.6rem] uppercase tracking-widest text-stone hover:text-red-400 transition-colors disabled:opacity-50">
          Void
        </button>
        {error && <span className="font-sans text-[0.6rem] text-red-400">{error}</span>}
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        type="text"
        required
        maxLength={255}
        autoFocus
        placeholder="Bank reference"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        className="bg-charcoal border border-carbon px-3 py-1.5 font-sans text-xs text-ivory focus:outline-none focus:border-gold transition-colors w-44"
      />
      <button type="submit" disabled={submitting || !reference} className="font-sans text-[0.6rem] uppercase tracking-widest text-gold hover:text-ivory transition-colors disabled:opacity-50">
        {submitting ? '…' : 'Save'}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="font-sans text-[0.6rem] uppercase tracking-widest text-stone hover:text-ivory transition-colors">
        Cancel
      </button>
      {error && <span className="font-sans text-[0.6rem] text-red-400">{error}</span>}
    </form>
  )
}
