'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ALL_STATUSES = [
  'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUESTED', 'DOCUMENTS_RECEIVED',
  'KYC_APPROVED', 'ACTIVE_INVESTOR', 'DEAL_SENT',
]

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
          className="w-full bg-[#1f1f1f] border border-carbon px-3 py-2 font-sans text-sm text-ivory focus:outline-none focus:border-gold"
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
          className="w-full bg-[#1f1f1f] border border-carbon px-3 py-2 font-sans text-sm text-ivory focus:outline-none focus:border-gold resize-none"
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
          className="w-full bg-[#1f1f1f] border border-carbon px-3 py-2 font-sans text-sm text-ivory focus:outline-none focus:border-gold resize-none"
          placeholder="Private notes — never shown to investor"
        />
      </div>

      <button
        onClick={handleUpdate}
        disabled={saving}
        className="w-full px-6 py-3 text-xs font-semibold uppercase tracking-widest border border-gold text-gold hover:bg-gold hover:text-obsidian transition-colors disabled:opacity-50"
      >
        {saving ? 'Updating…' : 'Update Status'}
      </button>

      {message && (
        <p className={`font-sans text-xs ${message.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
