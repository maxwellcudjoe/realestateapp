'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Button } from '@/components/ui/Button'

const FIELD_CLASS =
  'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold focus-visible:ring-1 focus-visible:ring-gold transition-colors'
const LABEL_CLASS =
  'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

const VERIFY_ERROR_MESSAGES: Record<string, string> = {
  invalid: 'Verification link is invalid.',
  used: 'This verification link has already been used.',
  expired: 'Verification link has expired. Please request a new one below.',
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/portal/status'
  const verified = searchParams.get('verified') === '1'
  const verifyError = searchParams.get('verifyError')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resentMessage, setResentMessage] = useState('')

  async function handleResend() {
    if (!email) {
      setError('Enter your email above first, then click Resend.')
      return
    }
    setResending(true)
    setResentMessage('')
    setError('')
    try {
      await fetch('/api/auth/verify-email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setResentMessage('If an unverified account exists, a new link has been sent.')
    } catch {
      setError('Could not resend. Try again in a moment.')
    } finally {
      setResending(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResentMessage('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password. If you just registered, please verify your email first.')
      setLoading(false)
    } else {
      // If no explicit callback, route based on role
      if (searchParams.get('callbackUrl')) {
        router.push(callbackUrl)
      } else {
        // Fetch session to determine role
        try {
          const res = await fetch('/api/auth/session')
          const session = await res.json()
          if (session?.user?.role === 'admin') {
            router.push('/admin/investors')
          } else {
            router.push('/portal/status')
          }
        } catch {
          router.push('/portal/status')
        }
      }
    }
  }

  return (
    <div className="w-full max-w-sm">
      <SectionLabel className="mb-4">Investor Portal</SectionLabel>
      <h1 className="font-serif text-4xl font-light text-ivory mb-8">Sign In</h1>

      {verified && (
        <div className="mb-6 p-4 border border-gold bg-gold/5">
          <p className="font-sans text-xs text-gold">
            Email verified. You can now sign in.
          </p>
        </div>
      )}
      {verifyError && VERIFY_ERROR_MESSAGES[verifyError] && (
        <div className="mb-6 p-4 border border-red-400/30 bg-red-400/5">
          <p className="font-sans text-xs text-red-400">
            {VERIFY_ERROR_MESSAGES[verifyError]}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className={LABEL_CLASS}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD_CLASS}
            placeholder="your@email.com"
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={FIELD_CLASS}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="font-sans text-xs text-red-400">{error}</p>
        )}
        {resentMessage && (
          <p className="font-sans text-xs text-gold">{resentMessage}</p>
        )}

        <Button type="submit" fullWidth disabled={loading} className="mt-2 py-4">
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>

        <p className="font-sans text-xs text-stone text-center">
          <a href="/forgot-password" className="text-gold hover:text-ivory transition-colors">
            Forgot your password?
          </a>
        </p>

        <p className="font-sans text-xs text-stone text-center">
          Didn&apos;t receive a verification email?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-gold hover:text-ivory transition-colors disabled:opacity-50"
          >
            {resending ? 'Sending…' : 'Resend it'}
          </button>
        </p>

        <p className="font-sans text-xs text-stone text-center mt-2">
          Don&apos;t have an account?{' '}
          <a href="/onboarding" className="text-gold hover:text-ivory transition-colors">
            Register as an investor
          </a>
        </p>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-obsidian pt-[72px] flex items-center justify-center px-8">
      <Suspense fallback={
        <div className="w-full max-w-sm text-center">
          <p className="font-sans text-sm text-stone">Loading…</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  )
}
