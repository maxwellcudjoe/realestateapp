'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DEAL_STAGES, dealStageDescription } from '@/lib/deal-stages'
import { Button } from '@/components/ui/Button'

const FIELD = 'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

interface Props {
  dealId: string
  currentStage: string
  dealLeadUserId: string | null
  solicitorContact: string | null
  brokerContact: string | null
  admins: { id: string; email: string }[]
}

export function DealStagePanel({ dealId, currentStage, dealLeadUserId, solicitorContact, brokerContact, admins }: Props) {
  const router = useRouter()
  const [stage, setStage] = useState(currentStage)
  const [note, setNote] = useState('')
  const [lead, setLead] = useState(dealLeadUserId ?? '')
  const [solicitor, setSolicitor] = useState(solicitorContact ?? '')
  const [broker, setBroker] = useState(brokerContact ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(false); setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/deals/${dealId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage, note: note || undefined,
          dealLeadUserId: lead || null,
          solicitorContact: solicitor || null,
          brokerContact: broker || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Failed')
      } else {
        setSuccess(true); setNote('')
        router.refresh()
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className={LABEL}>Current Stage</label>
        <select value={stage} onChange={(e) => setStage(e.target.value)} className={FIELD}>
          {DEAL_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <p className="font-sans text-[0.6rem] text-stone mt-1">{dealStageDescription(stage)}</p>
      </div>
      <div>
        <label className={LABEL}>Note to investor (optional, shown in timeline)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={FIELD} placeholder="e.g. Vendor accepted offer at £245k" />
      </div>
      <div className="border-t border-carbon pt-5 space-y-4">
        <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Deal Team</p>
        <div>
          <label className={LABEL}>Lead admin contact</label>
          <select value={lead} onChange={(e) => setLead(e.target.value)} className={FIELD}>
            <option value="">— None assigned —</option>
            {admins.map((a) => <option key={a.id} value={a.id}>{a.email}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Solicitor (name + contact)</label>
          <input type="text" value={solicitor} onChange={(e) => setSolicitor(e.target.value)} className={FIELD} placeholder="e.g. Sarah Jones, sarah@firm.co.uk, 020 1234 5678" />
        </div>
        <div>
          <label className={LABEL}>Mortgage broker (name + contact)</label>
          <input type="text" value={broker} onChange={(e) => setBroker(e.target.value)} className={FIELD} placeholder="e.g. James Smith, james@broker.co.uk, 020 9876 5432" />
        </div>
      </div>
      {error && <p className="font-sans text-xs text-red-400">{error}</p>}
      {success && <p className="font-sans text-xs text-gold">Saved.</p>}
      <Button type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Save Stage'}</Button>
    </form>
  )
}
