'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Button } from '@/components/ui/Button'

const FIELD_CLASS =
  'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold focus-visible:ring-1 focus-visible:ring-gold transition-colors'
const LABEL_CLASS =
  'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div className="border border-red-400/30 p-6">
        <p className="font-sans text-sm text-red-400">Invalid reset link. Please request a new one.</p>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const json = await res.json()
      if (res.ok) {
        setDone(true)
        setTimeout(() => router.push('/login'), 3000)
      } else {
        setError(json.error || 'Something went wrong.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="border border-gold/30 p-6">
        <p className="font-sans text-sm text-ivory mb-1">Password updated</p>
        <p className="font-sans text-xs text-stone">Your password has been reset. Redirecting you to sign in…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className={LABEL_CLASS}>New Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={FIELD_CLASS}
          placeholder="Minimum 8 characters"
        />
      </div>
      <div>
        <label className={LABEL_CLASS}>Confirm New Password</label>
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={FIELD_CLASS}
          placeholder="Repeat your password"
        />
      </div>

      {error && <p className="font-sans text-xs text-red-400">{error}</p>}

      <Button type="submit" fullWidth disabled={loading} className="mt-2 py-4">
        {loading ? 'Updating…' : 'Set New Password'}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-obsidian pt-[72px] flex items-center justify-center px-8">
      <div className="w-full max-w-sm">
        <SectionLabel className="mb-4">Investor Portal</SectionLabel>
        <h1 className="font-serif text-4xl font-light text-ivory mb-8">Set New Password</h1>
        <Suspense fallback={<p className="font-sans text-sm text-stone">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
