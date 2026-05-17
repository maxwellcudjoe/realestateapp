'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

const STAGES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'DOCUMENTS_REQUESTED',
  'DOCUMENTS_RECEIVED',
  'KYC_APPROVED',
  'ACTIVE_INVESTOR',
  'DEAL_SENT',
]

const STAGE_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  DOCUMENTS_REQUESTED: 'Documents Requested',
  DOCUMENTS_RECEIVED: 'Documents Received',
  KYC_APPROVED: 'KYC Approved',
  ACTIVE_INVESTOR: 'Active Investor',
  DEAL_SENT: 'Deal Sent',
}

// What the primary action button says for each current status
const NEXT_ACTION: Record<string, { label: string; nextStatus: string; suggestion: string } | null> = {
  SUBMITTED: {
    label: 'Begin Review',
    nextStatus: 'UNDER_REVIEW',
    suggestion: 'Thank you for registering with Rêve Bâtir Realty. We have received your application and our team has begun reviewing your profile.',
  },
  UNDER_REVIEW: {
    label: 'Request Documents',
    nextStatus: 'DOCUMENTS_REQUESTED',
    suggestion: 'After reviewing your application we would like to proceed. Please upload the following: (1) Passport or driving licence, (2) Proof of address dated within 3 months, (3) Source of funds — bank statement, payslip, or solicitor letter.',
  },
  DOCUMENTS_REQUESTED: {
    label: 'Confirm Documents Received',
    nextStatus: 'DOCUMENTS_RECEIVED',
    suggestion: 'Thank you for uploading your documents. Our compliance team is now reviewing them. We aim to complete KYC verification within 5 business days.',
  },
  DOCUMENTS_RECEIVED: {
    label: 'Approve KYC',
    nextStatus: 'KYC_APPROVED',
    suggestion: 'Your identity and source of funds have been verified. Your investor profile is now approved.',
  },
  KYC_APPROVED: {
    label: 'Activate Investor',
    nextStatus: 'ACTIVE_INVESTOR',
    suggestion: 'Welcome to Rêve Bâtir Realty. Your profile is now live and you will begin receiving property deals matched to your investment criteria.',
  },
  ACTIVE_INVESTOR: {
    label: 'Mark Deal Sent',
    nextStatus: 'DEAL_SENT',
    suggestion: 'We have sent you a property deal that matches your investment criteria. Please check your email for full details.',
  },
  DEAL_SENT: null,
}

const FIELD_CLASS =
  'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold focus-visible:ring-1 focus-visible:ring-gold transition-colors'

interface Props {
  applicationId: string
  currentStatus: string
  adminNotes: string | null
}

export function StatusPanel({ applicationId, currentStatus, adminNotes: initialNotes }: Props) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [adminNotes, setAdminNotes] = useState(initialNotes || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showOverride, setShowOverride] = useState(false)
  const [overrideStatus, setOverrideStatus] = useState(currentStatus)

  const currentIndex = STAGES.indexOf(currentStatus)
  const nextAction = NEXT_ACTION[currentStatus]

  async function submitUpdate(targetStatus: string, noteText: string) {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch(`/api/admin/investors/${applicationId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          note: noteText || undefined,
          adminNotes: adminNotes || undefined,
        }),
      })
      if (res.ok) {
        setMessage('Updated successfully')
        setNote('')
        setShowOverride(false)
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
    <div className="space-y-6">

      {/* Stage progress */}
      <div>
        <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-3">Progress</p>
        <div className="space-y-1.5">
          {STAGES.map((stage, i) => {
            const done = i < currentIndex
            const active = i === currentIndex
            return (
              <div key={stage} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  done ? 'bg-gold' : active ? 'border border-gold bg-obsidian' : 'bg-carbon'
                }`} />
                <span className={`font-sans text-xs ${
                  active ? 'text-gold' : done ? 'text-ivory' : 'text-stone'
                }`}>
                  {STAGE_LABELS[stage]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="border-t border-carbon pt-6 space-y-4">

        {/* Next action */}
        {nextAction ? (
          <>
            <div>
              <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-2">Next Step</p>
              <p className="font-sans text-sm text-ivory font-medium">{nextAction.label}</p>
              <p className="font-sans text-xs text-stone mt-0.5">→ {STAGE_LABELS[nextAction.nextStatus]}</p>
            </div>

            <div>
              <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">
                Note to Investor
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className={`${FIELD_CLASS} resize-none`}
                placeholder={nextAction.suggestion}
              />
              <p className="font-sans text-[0.55rem] text-stone mt-1">Shown in their portal timeline</p>
            </div>

            <Button
              onClick={() => submitUpdate(nextAction.nextStatus, note || nextAction.suggestion)}
              disabled={saving}
              fullWidth
            >
              {saving ? 'Updating…' : nextAction.label}
            </Button>
          </>
        ) : (
          <div className="border border-gold/30 p-4">
            <p className="font-sans text-xs text-gold">✓ Deal sent — workflow complete.</p>
            <p className="font-sans text-xs text-stone mt-1">Use manual override below to make any further updates.</p>
          </div>
        )}

        {/* Internal notes */}
        <div>
          <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">
            Internal Notes <span className="normal-case">(private)</span>
          </label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            className={`${FIELD_CLASS} resize-none`}
            placeholder="Private notes — never shown to investor"
          />
        </div>

        {/* Override toggle */}
        <div className="border-t border-carbon pt-4">
          <button
            onClick={() => setShowOverride(!showOverride)}
            className="font-sans text-[0.6rem] uppercase tracking-widest text-stone hover:text-gold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
          >
            {showOverride ? '▲ Hide override' : '▼ Manual status override'}
          </button>

          {showOverride && (
            <div className="mt-4 space-y-3">
              <select
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value)}
                className={FIELD_CLASS}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
              <Button
                onClick={() => submitUpdate(overrideStatus, note)}
                disabled={saving || overrideStatus === currentStatus}
                fullWidth
                variant="secondary"
              >
                {saving ? 'Updating…' : 'Apply Override'}
              </Button>
            </div>
          )}
        </div>

        {message && (
          <p className={`font-sans text-xs ${message.includes('success') ? 'text-gold' : 'text-red-400'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
