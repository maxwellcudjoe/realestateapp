'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/Button'

// Load the WebSDK only on the client (it touches window)
const SumsubWebSdk = dynamic(() => import('@sumsub/websdk-react'), { ssr: false })

type State = 'idle' | 'fetching' | 'ready' | 'unavailable' | 'error'

export function SumSubKycWidget() {
  const [state, setState] = useState<State>('idle')
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function fetchToken() {
    setState('fetching'); setError('')
    try {
      const res = await fetch('/api/portal/kyc/sumsub-token', { method: 'POST' })
      if (res.status === 503) {
        setState('unavailable')
        return
      }
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to start verification')
        setState('error')
        return
      }
      setToken(json.token)
      setState('ready')
    } catch {
      setError('Network error')
      setState('error')
    }
  }

  // Refresh expired tokens automatically
  async function refreshToken(): Promise<string> {
    const res = await fetch('/api/portal/kyc/sumsub-token', { method: 'POST' })
    const json = await res.json()
    if (!res.ok || !json.token) throw new Error(json.error ?? 'Token refresh failed')
    return json.token
  }

  if (state === 'unavailable') {
    return (
      <div className="border border-carbon p-5">
        <p className="font-sans text-sm text-stone">
          Automated identity verification isn&apos;t enabled on this environment. Please use the document upload above.
        </p>
      </div>
    )
  }

  if (state === 'ready' && token) {
    return (
      <div className="border border-gold bg-gold/5 p-2">
        <SumsubWebSdk
          accessToken={token}
          expirationHandler={refreshToken}
          config={{ lang: 'en' }}
          options={{ addViewportTag: false, adaptIframeHeight: true }}
          onMessage={(type: string) => {
            // Optional: react to events like "idCheck.applicantStatus"
            // We trust the webhook for canonical state, this is just UX feedback
            if (type === 'idCheck.onApplicantSubmitted') {
              // Could show a banner
            }
          }}
          onError={(e: unknown) => console.error('[sumsub-websdk]', e)}
        />
      </div>
    )
  }

  return (
    <div className="border border-carbon p-5 space-y-4">
      <p className="font-sans text-sm text-stone">
        Verify your identity in 5 minutes via our secure provider — passport / driving licence + selfie.
      </p>
      {error && <p className="font-sans text-xs text-red-400">{error}</p>}
      <Button type="button" onClick={fetchToken} disabled={state === 'fetching'}>
        {state === 'fetching' ? 'Starting…' : 'Start identity verification'}
      </Button>
    </div>
  )
}
