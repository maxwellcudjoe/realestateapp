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

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/portal/status'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password.')
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

        <Button type="submit" fullWidth disabled={loading} className="mt-2 py-4">
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>

        <p className="font-sans text-xs text-stone text-center">
          <a href="/forgot-password" className="text-gold hover:text-ivory transition-colors">
            Forgot your password?
          </a>
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
