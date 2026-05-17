'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PasswordStrengthMeter } from '@/components/onboarding/PasswordStrengthMeter'

const FIELD_CLASS =
  'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'
const LABEL_CLASS =
  'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

export function PasswordChangeForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(false)
    if (next !== confirm) { setError('New password and confirmation do not match.'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/portal/password/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed')
      } else {
        setSuccess(true)
        setCurrent(''); setNext(''); setConfirm('')
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <div>
        <label className={LABEL_CLASS}>Current Password</label>
        <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} className={FIELD_CLASS} />
      </div>
      <div>
        <label className={LABEL_CLASS}>New Password</label>
        <input type="password" required value={next} onChange={(e) => setNext(e.target.value)} className={FIELD_CLASS} placeholder="8+ chars, mix of upper, lower, number & symbol" />
        <PasswordStrengthMeter password={next} />
      </div>
      <div>
        <label className={LABEL_CLASS}>Confirm New Password</label>
        <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={FIELD_CLASS} />
      </div>
      {error && <p className="font-sans text-xs text-red-400">{error}</p>}
      {success && <p className="font-sans text-xs text-gold">Password changed successfully.</p>}
      <Button type="submit" disabled={submitting || !current || !next || !confirm}>
        {submitting ? 'Changing…' : 'Change Password'}
      </Button>
    </form>
  )
}
