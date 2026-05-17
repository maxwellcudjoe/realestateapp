'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Button } from '@/components/ui/Button'

const FIELD_CLASS =
  'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold focus-visible:ring-1 focus-visible:ring-gold transition-colors'
const LABEL_CLASS =
  'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        const json = await res.json()
        setError(json.error || 'Something went wrong.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-obsidian pt-[72px] flex items-center justify-center px-8">
      <div className="w-full max-w-sm">
        <SectionLabel className="mb-4">Investor Portal</SectionLabel>
        <h1 className="font-serif text-4xl font-light text-ivory mb-2">Forgot Password</h1>

        {sent ? (
          <div className="mt-8">
            <div className="border border-gold/30 p-6 mb-6">
              <p className="font-sans text-sm text-ivory mb-2">Check your email</p>
              <p className="font-sans text-xs text-stone">
                If an account exists for <span className="text-ivory">{email}</span>, we have sent a password reset link. The link expires in 1 hour.
              </p>
            </div>
            <Link
              href="/login"
              className="font-sans text-xs text-gold hover:text-ivory transition-colors"
            >
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="font-sans text-sm text-stone mb-8">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className={LABEL_CLASS}>Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={FIELD_CLASS}
                  placeholder="your@email.com"
                />
              </div>

              {error && <p className="font-sans text-xs text-red-400">{error}</p>}

              <Button type="submit" fullWidth disabled={loading} className="mt-2 py-4">
                {loading ? 'Sending…' : 'Send Reset Link'}
              </Button>

              <p className="font-sans text-xs text-stone text-center">
                <Link href="/login" className="text-gold hover:text-ivory transition-colors">
                  ← Back to sign in
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
