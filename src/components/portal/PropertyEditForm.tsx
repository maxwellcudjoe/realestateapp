'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

const FIELD = 'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

export interface PropertyInitial {
  id: string
  currentValueEstimate: number | null
  tenancyStatus: string
  monthlyRent: number | null
  tenancyStart: string | null
  tenancyEnd: string | null
  notes: string | null
}

export function PropertyEditForm({ initial }: { initial: PropertyInitial }) {
  const router = useRouter()
  const [currentValueEstimate, setCurrentValueEstimate] = useState<string>(initial.currentValueEstimate?.toString() ?? '')
  const [tenancyStatus, setTenancyStatus] = useState(initial.tenancyStatus)
  const [monthlyRent, setMonthlyRent] = useState<string>(initial.monthlyRent?.toString() ?? '')
  const [tenancyStart, setTenancyStart] = useState(initial.tenancyStart?.slice(0, 10) ?? '')
  const [tenancyEnd, setTenancyEnd] = useState(initial.tenancyEnd?.slice(0, 10) ?? '')
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(false); setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        currentValueEstimate: currentValueEstimate === '' ? null : Number(currentValueEstimate),
        tenancyStatus,
        monthlyRent: monthlyRent === '' ? null : Number(monthlyRent),
        tenancyStart: tenancyStart || null,
        tenancyEnd: tenancyEnd || null,
        notes: notes || null,
      }
      const res = await fetch(`/api/portal/properties/${initial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setError(json.error ?? 'Save failed')
      else {
        setSuccess(true)
        router.refresh()
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={LABEL}>Current value estimate (£)</label>
          <input type="number" min={0} value={currentValueEstimate} onChange={(e) => setCurrentValueEstimate(e.target.value)} className={FIELD} placeholder="e.g. 260000" />
        </div>
        <div>
          <label className={LABEL}>Tenancy status</label>
          <select value={tenancyStatus} onChange={(e) => setTenancyStatus(e.target.value)} className={FIELD}>
            <option value="VACANT">Vacant</option>
            <option value="TENANTED">Tenanted</option>
            <option value="OWN_USE">Own use</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div>
          <label className={LABEL}>Monthly rent (£)</label>
          <input type="number" min={0} value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} className={FIELD} placeholder="1100" />
        </div>
        <div>
          <label className={LABEL}>Tenancy start</label>
          <input type="date" value={tenancyStart} onChange={(e) => setTenancyStart(e.target.value)} className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Tenancy end</label>
          <input type="date" value={tenancyEnd} onChange={(e) => setTenancyEnd(e.target.value)} className={FIELD} />
        </div>
      </div>
      <div>
        <label className={LABEL}>Notes</label>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={FIELD} placeholder="Refurb planned for spring…" />
      </div>
      {error && <p className="font-sans text-xs text-red-400">{error}</p>}
      {success && <p className="font-sans text-xs text-gold">Saved.</p>}
      <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save changes'}</Button>
    </form>
  )
}
