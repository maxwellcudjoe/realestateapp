'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Button } from '@/components/ui/Button'

function VerifyEmailSentInner() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')

  async function handleResend() {
    if (!email) return
    setResending(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error('Resend failed')
      setResent(true)
    } catch {
      setError('Could not resend. Please try again in a moment.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="w-full max-w-md text-center">
      <SectionLabel className="mb-4">Almost There</SectionLabel>
      <h1 className="font-serif text-4xl font-light text-ivory mb-6">Check Your Inbox</h1>
      <p className="font-sans text-sm text-stone mb-2">
        We&apos;ve sent a verification link to
      </p>
      <p className="font-sans text-sm text-gold mb-8 break-all">
        {email || 'your email address'}
      </p>
      <p className="font-sans text-xs text-stone mb-8 leading-relaxed">
        Click the link in the email to activate your account. The link expires in 24 hours.
        Don&apos;t forget to check your spam folder.
      </p>

      {resent && (
        <p className="font-sans text-xs text-gold mb-4">
          A new verification link has been sent.
        </p>
      )}
      {error && (
        <p className="font-sans text-xs text-red-400 mb-4">{error}</p>
      )}

      <div className="space-y-3">
        <Button onClick={handleResend} disabled={!email || resending || resent} fullWidth>
          {resending ? 'Resending…' : resent ? 'Email Sent' : 'Resend Verification Email'}
        </Button>
        <p className="font-sans text-xs text-stone">
          Already verified?{' '}
          <Link href="/login" className="text-gold hover:text-ivory transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function VerifyEmailSentPage() {
  return (
    <div className="min-h-screen bg-obsidian pt-[72px] flex items-center justify-center px-8">
      <Suspense fallback={
        <div className="w-full max-w-md text-center">
          <p className="font-sans text-sm text-stone">Loading…</p>
        </div>
      }>
        <VerifyEmailSentInner />
      </Suspense>
    </div>
  )
}
