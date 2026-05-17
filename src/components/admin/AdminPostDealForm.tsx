'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface Props {
  applicationId: string
}

export function AdminPostDealForm({ applicationId }: Props) {
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [askingPrice, setAskingPrice] = useState('')
  const [summary, setSummary] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const price = parseFloat(askingPrice.replace(/,/g, ''))
    if (isNaN(price) || price <= 0) {
      setError('Asking price must be a positive number')
      return
    }
    setSubmitting(true)
    setError('')
    setSuccess(false)
    try {
      const res = await fetch(`/api/admin/investors/${applicationId}/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          address: address.trim(),
          askingPrice: price,
          summary: summary.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setTitle('')
      setAddress('')
      setAskingPrice('')
      setSummary('')
      setSuccess(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={255}
          placeholder="e.g. 2-bed terraced, Birmingham"
          className="w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors"
        />
      </div>
      <div>
        <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">Address</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          maxLength={255}
          placeholder="14 Maple Street, Birmingham, B1 1AA"
          className="w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors"
        />
      </div>
      <div>
        <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">Asking Price (£)</label>
        <input
          type="text"
          value={askingPrice}
          onChange={(e) => setAskingPrice(e.target.value)}
          required
          placeholder="185000"
          className="w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors"
        />
      </div>
      <div>
        <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">Summary (optional)</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={4}
          placeholder="Two-bed mid-terrace, 7.2% gross yield, vacant possession, no chain."
          className="w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors resize-none"
        />
      </div>
      {error && <p className="font-sans text-xs text-red-400">{error}</p>}
      {success && <p className="font-sans text-xs text-gold">Deal posted — investor notified by email.</p>}
      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? 'Posting…' : 'Post Deal'}
      </Button>
    </form>
  )
}
