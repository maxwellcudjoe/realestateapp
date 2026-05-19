'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

type ActionKey = 'resend-verification' | 'disable-2fa' | 'force-password-reset' | 'soft-delete' | 'restore' | 'impersonate'

interface Props {
  userId: string
  email: string
  emailVerified: boolean
  totpEnabled: boolean
  isDeleted: boolean
}

const FIELD =
  'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'

export function UserActionsPanel({ userId, email, emailVerified, totpEnabled, isDeleted }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState<ActionKey | null>(null)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function reset() {
    setOpen(null)
    setReason('')
    setError('')
  }

  async function call(action: ActionKey, body: Record<string, unknown> | null = null) {
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.message ?? json.error ?? 'Failed')
        return
      }
      setMessage('Done')
      reset()
      if (action === 'impersonate') {
        // Navigate to the investor portal — cookie is set, banner will render.
        router.push('/portal')
        router.refresh()
      } else {
        router.refresh()
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!open) return
    if (open === 'disable-2fa' || open === 'soft-delete') {
      if (reason.trim().length < 3) {
        setError('Reason required (3+ chars)')
        return
      }
      call(open, { reason: reason.trim() })
    } else {
      call(open)
    }
  }

  const isDestructive = (k: ActionKey) => k === 'disable-2fa' || k === 'soft-delete'
  const promptCopy: Record<ActionKey, { title: string; description: string; cta: string }> = {
    'resend-verification': {
      title: 'Resend verification email',
      description: `Send a fresh email-verification link to ${email}.`,
      cta: 'Send email',
    },
    'disable-2fa': {
      title: 'Disable 2FA',
      description: 'Clears TOTP secret and recovery codes. User can re-enrol from /portal/security after next login.',
      cta: 'Disable 2FA',
    },
    'force-password-reset': {
      title: 'Force password reset',
      description: `Sends a reset link to ${email}. Existing password remains valid until they complete the flow.`,
      cta: 'Send reset link',
    },
    'soft-delete': {
      title: 'Soft-delete account',
      description: 'User cannot sign in. Personal data is preserved for 30 days, then anonymised by cron.',
      cta: 'Soft-delete',
    },
    'restore': {
      title: 'Restore account',
      description: 'Clears the deletion flag. Only valid before anonymisation cron has run.',
      cta: 'Restore',
    },
    'impersonate': {
      title: 'Impersonate user (read-only)',
      description: 'View the portal as this investor sees it for 30 minutes. All writes are blocked by middleware. Both start and end are recorded in the audit log.',
      cta: 'Start impersonation',
    },
  }

  return (
    <div className="border border-carbon p-6">
      <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Admin actions</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {!emailVerified && (
          <button
            onClick={() => setOpen('resend-verification')}
            className="px-4 py-2 border border-carbon text-stone hover:border-gold hover:text-gold font-sans text-[0.6rem] uppercase tracking-widest transition-colors text-left"
          >
            Resend verification email
          </button>
        )}
        {totpEnabled && (
          <button
            onClick={() => setOpen('disable-2fa')}
            className="px-4 py-2 border border-carbon text-stone hover:border-gold hover:text-gold font-sans text-[0.6rem] uppercase tracking-widest transition-colors text-left"
          >
            Disable 2FA
          </button>
        )}
        <button
          onClick={() => setOpen('force-password-reset')}
          className="px-4 py-2 border border-carbon text-stone hover:border-gold hover:text-gold font-sans text-[0.6rem] uppercase tracking-widest transition-colors text-left"
        >
          Force password reset
        </button>
        {!isDeleted ? (
          <button
            onClick={() => setOpen('soft-delete')}
            className="px-4 py-2 border border-red-500/30 text-red-400 hover:border-red-500 font-sans text-[0.6rem] uppercase tracking-widest transition-colors text-left"
          >
            Soft-delete account
          </button>
        ) : (
          <button
            onClick={() => setOpen('restore')}
            className="px-4 py-2 border border-gold/30 text-gold hover:border-gold font-sans text-[0.6rem] uppercase tracking-widest transition-colors text-left"
          >
            Restore account
          </button>
        )}
        {!isDeleted && (
          <button
            onClick={() => setOpen('impersonate')}
            className="px-4 py-2 border border-carbon text-stone hover:border-gold hover:text-gold font-sans text-[0.6rem] uppercase tracking-widest transition-colors text-left"
          >
            Impersonate (read-only)
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className="space-y-4 mt-4 pt-4 border-t border-carbon">
          <div>
            <p className="font-sans text-sm text-ivory">{promptCopy[open].title}</p>
            <p className="font-sans text-xs text-stone mt-1">{promptCopy[open].description}</p>
          </div>

          {isDestructive(open) && (
            <div>
              <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">
                Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className={`${FIELD} resize-none`}
                placeholder="Required for audit trail"
              />
            </div>
          )}

          {error && <p className="font-sans text-xs text-red-400">{error}</p>}

          <div className="flex items-center gap-4">
            <Button
              type="submit"
              disabled={submitting || (isDestructive(open) && reason.trim().length < 3)}
              variant={isDestructive(open) ? 'secondary' : 'primary'}
            >
              {submitting ? 'Working…' : promptCopy[open].cta}
            </Button>
            <button
              type="button"
              onClick={reset}
              className="font-sans text-xs uppercase tracking-widest text-stone hover:text-ivory transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {message && !open && (
        <p className="font-sans text-xs text-gold mt-3">{message}</p>
      )}
    </div>
  )
}
