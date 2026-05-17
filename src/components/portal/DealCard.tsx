'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

const INTENT_OPTIONS = [
  { value: 'ACCEPT', label: "Interested — let's proceed" },
  { value: 'MORE_INFO', label: 'Interested — need more info' },
  { value: 'PASS', label: 'Not interested — passing' },
] as const

const INTENT_DISPLAY: Record<string, string> = {
  ACCEPT: "Interested — let's proceed",
  MORE_INFO: 'Interested — need more info',
  PASS: 'Not interested — passing',
}

interface DealResponseData {
  id: string
  intent: string
  comment: string | null
  createdAt: string
  updatedAt: string
}

export interface DealData {
  id: string
  title: string
  address: string
  askingPrice: number
  summary: string | null
  status: string
  createdAt: string
  response: DealResponseData | null
}

interface Props {
  deal: DealData
  onMutated: () => void
}

type CardState = 'view' | 'responding' | 'editing' | 'confirmDelete'

export function DealCard({ deal, onMutated }: Props) {
  const [cardState, setCardState] = useState<CardState>('view')
  const [intent, setIntent] = useState<string>(deal.response?.intent ?? '')
  const [comment, setComment] = useState<string>(deal.response?.comment ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const priceFormatted = `£${Number(deal.askingPrice).toLocaleString('en-GB')}`
  const postedDate = new Date(deal.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  function resetError() { setError('') }

  async function submitResponse() {
    if (!intent) return
    setSubmitting(true)
    resetError()
    try {
      const res = await fetch(`/api/portal/deals/${deal.id}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, comment: comment.trim() || undefined }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setCardState('view')
      onMutated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function updateResponse() {
    if (!intent) return
    setSubmitting(true)
    resetError()
    try {
      const res = await fetch(`/api/portal/deals/${deal.id}/response`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, comment: comment.trim() || undefined }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setCardState('view')
      onMutated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteResponse() {
    setSubmitting(true)
    resetError()
    try {
      const res = await fetch(`/api/portal/deals/${deal.id}/response`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setIntent('')
      setComment('')
      setCardState('view')
      onMutated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit() {
    setIntent(deal.response?.intent ?? '')
    setComment(deal.response?.comment ?? '')
    resetError()
    setCardState('editing')
  }

  return (
    <div className="border border-carbon p-6 space-y-5">
      {/* Deal header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone/60 mb-1">
            Posted {postedDate}
          </p>
          <h3 className="font-serif text-xl font-light text-ivory">{deal.title}</h3>
          <p className="font-sans text-xs text-stone mt-0.5">{deal.address}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone/60 mb-1">Asking Price</p>
          <p className="font-sans text-base text-gold">{priceFormatted}</p>
        </div>
      </div>

      {deal.summary && (
        <p className="font-sans text-xs text-stone leading-relaxed border-l-2 border-carbon pl-4 italic">
          {deal.summary}
        </p>
      )}

      {/* Response section */}
      <div className="border-t border-carbon pt-5">
        <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Your Response</p>

        {/* No response, idle */}
        {!deal.response && cardState === 'view' && (
          <Button variant="secondary" onClick={() => setCardState('responding')}>
            Submit Response
          </Button>
        )}

        {/* Response form — create or edit */}
        {(cardState === 'responding' || cardState === 'editing') && (
          <div className="space-y-4">
            <div>
              <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">
                Your Intent
              </label>
              <select
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                className="w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors"
              >
                <option value="" disabled>Select your response…</option>
                {INTENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">
                Comment (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Any questions or notes for the team…"
                className="w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors resize-none"
              />
            </div>
            {error && <p className="font-sans text-xs text-red-400">{error}</p>}
            <div className="flex gap-4">
              <Button
                variant="primary"
                onClick={cardState === 'editing' ? updateResponse : submitResponse}
                disabled={submitting || !intent}
              >
                {submitting ? 'Saving…' : cardState === 'editing' ? 'Update Response' : 'Submit Response'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => { setCardState('view'); resetError() }}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Existing response display */}
        {deal.response && cardState === 'view' && (
          <div className="space-y-3">
            <p className="font-sans text-sm font-medium text-ivory">
              {INTENT_DISPLAY[deal.response.intent] ?? deal.response.intent}
            </p>
            {deal.response.comment && (
              <p className="font-sans text-xs text-stone leading-relaxed">
                &ldquo;{deal.response.comment}&rdquo;
              </p>
            )}
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone/50">
              Responded {new Date(deal.response.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </p>
            <div className="flex gap-4 pt-1">
              <button
                onClick={startEdit}
                className="font-sans text-xs uppercase tracking-widest text-gold hover:text-ivory transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => { resetError(); setCardState('confirmDelete') }}
                className="font-sans text-xs uppercase tracking-widest text-stone hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Confirm delete */}
        {cardState === 'confirmDelete' && (
          <div className="space-y-3">
            <p className="font-sans text-xs text-stone">
              Are you sure you want to withdraw your response?
            </p>
            {error && <p className="font-sans text-xs text-red-400">{error}</p>}
            <div className="flex gap-4">
              <button
                onClick={deleteResponse}
                disabled={submitting}
                className="font-sans text-xs uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Deleting…' : 'Confirm Delete'}
              </button>
              <button
                onClick={() => { setCardState('view'); resetError() }}
                disabled={submitting}
                className="font-sans text-xs uppercase tracking-widest text-stone hover:text-ivory transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
