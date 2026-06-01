'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function Form() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [gdpr, setGdpr] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) setError('Missing setup token — ask the team to resend the invite.')
  }, [token])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 12) { setError('Password must be at least 12 characters'); return }
    if (!gdpr) { setError('Please accept the privacy notice to continue'); return }
    setPending(true)
    const res = await fetch('/api/auth/finish-setup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password, gdprConsent: gdpr }),
    })
    setPending(false)
    if (res.ok) {
      router.push('/portal/dashboard?welcome=1')
    } else {
      const json = await res.json().catch(() => ({}))
      setError(json.error ?? 'Setup failed')
    }
  }

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-2">Finish setting up your account</h1>
      <p className="text-sm text-stone-600 mb-6">Choose a password to activate your Rêve Bâtir investor account.</p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-sm">Password (12+ chars)</span>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            required minLength={12} autoComplete="new-password"
            className="mt-1 w-full border border-stone-300 rounded px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm">Confirm password</span>
          <input
            type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            required minLength={12} autoComplete="new-password"
            className="mt-1 w-full border border-stone-300 rounded px-3 py-2"
          />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={gdpr} onChange={(e) => setGdpr(e.target.checked)} className="mt-1" />
          <span>I accept Rêve Bâtir&apos;s privacy notice and consent to the processing of the information held for my onboarding.</span>
        </label>
        {error && <p className="text-rose-700 text-sm">{error}</p>}
        <button
          type="submit" disabled={pending || !token}
          className="w-full bg-stone-900 text-white py-2 rounded disabled:opacity-50"
        >
          {pending ? 'Setting up…' : 'Activate my account'}
        </button>
      </form>
    </div>
  )
}

export default function FinishSetupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-stone-500">Loading…</div>}>
      <Form />
    </Suspense>
  )
}
