'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

const ALL_STATUSES = [
  'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUESTED', 'DOCUMENTS_RECEIVED',
  'KYC_APPROVED', 'ACTIVE_INVESTOR', 'DEAL_SENT',
]

const FIELD_CLASS =
  'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold focus-visible:ring-1 focus-visible:ring-gold transition-colors'

interface Props {
  applicationId: string
  currentStatus: string
  adminNotes: string | null
}

export function StatusPanel({ applicationId, currentStatus, adminNotes: initialNotes }: Props) {
  const router = useRouter()
  const [newStatus, setNewStatus] = useState(currentStatus)
  const [note, setNote] = useState('')
  const [adminNotes, setAdminNotes] = useState(initialNotes || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function handleUpdate() {
    if (newStatus === currentStatus && !note && adminNotes === (initialNotes || '')) return
    setSaving(true)
    setMessage('')

    try {
      const res = await fetch(`/api/admin/investors/${applicationId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          note: note || undefined,
          adminNotes: adminNotes || undefined,
        }),
      })

      if (res.ok) {
        setMessage('Updated successfully')
        setNote('')
        router.refresh()
      } else {
        const json = await res.json()
        setMessage(json.error || 'Update failed')
      }
    } catch {
      setMessage('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-2">Current Status</p>
        <p className="font-sans text-lg text-ivory">{currentStatus.replace(/_/g, ' ')}</p>
      </div>

      <div>
        <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">
          Change Status
        </label>
        <select
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          className={FIELD_CLASS}
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">
          Note to Investor (visible)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className={`${FIELD_CLASS} resize-none`}
          placeholder="Optional — shown in their status timeline"
        />
      </div>

      <div>
        <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">
          Internal Notes (private)
        </label>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={3}
          className={`${FIELD_CLASS} resize-none`}
          placeholder="Private notes — never shown to investor"
        />
      </div>

      <Button onClick={handleUpdate} disabled={saving} fullWidth>
        {saving ? 'Updating…' : 'Update Status'}
      </Button>

      {message && (
        <p className={`font-sans text-xs ${message.includes('success') ? 'text-gold' : 'text-red-400'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
