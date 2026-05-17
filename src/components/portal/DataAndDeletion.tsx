'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

const FIELD =
  'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

export function DataAndDeletion() {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/portal/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirm }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Failed')
        setSubmitting(false)
      } else {
        // Hard navigate so the now-invalid session cookie is cleared on the next request.
        window.location.href = '/?deleted=1'
      }
    } catch {
      setError('Network error')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="font-sans text-sm text-stone mb-4 max-w-xl leading-relaxed">
          Under UK GDPR (Article 20) you can download a copy of every personal record
          tied to your account. The download is a JSON file you can re-use elsewhere.
        </p>
        <a
          href="/api/portal/data-export"
          className="inline-block px-6 py-3 text-xs font-semibold uppercase tracking-widest border border-gold text-gold hover:bg-gold hover:text-obsidian transition-colors"
        >
          Download my data &darr;
        </a>
      </div>

      <div className="border-t border-carbon pt-8">
        <p className="font-sans text-sm text-stone mb-4 max-w-xl leading-relaxed">
          Under UK GDPR (Article 17) you can request deletion of your account. We anonymise
          your personal data immediately and keep audit-required records for 7 years as
          required by UK Money Laundering Regulations (MLR 2017).{' '}
          <span className="text-red-400">This cannot be undone.</span>
        </p>

        {!deleteOpen ? (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="font-sans text-xs uppercase tracking-widest text-stone hover:text-red-400 transition-colors"
          >
            Delete my account
          </button>
        ) : (
          <form onSubmit={deleteAccount} className="space-y-4 max-w-md border border-red-400/30 bg-red-400/5 p-5">
            <div>
              <label className={LABEL}>Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Type DELETE to confirm</label>
              <input type="text" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={FIELD} placeholder="DELETE" />
            </div>
            {error && <p className="font-sans text-xs text-red-400">{error}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || !password || confirm !== 'DELETE'}
                className="px-6 py-3 text-xs font-semibold uppercase tracking-widest border border-red-400 text-red-400 hover:bg-red-400 hover:text-obsidian transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Deleting…' : 'Delete Forever'}
              </button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setDeleteOpen(false); setError(''); setPassword(''); setConfirm('') }}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
