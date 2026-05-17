'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

const FIELD_CLASS =
  'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'
const LABEL_CLASS =
  'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

type EnrolStep = 'idle' | 'show-qr' | 'show-codes'

interface Props {
  initiallyEnabled: boolean
  enabledAt?: string | null
}

export function TotpManager({ initiallyEnabled, enabledAt }: Props) {
  const [enabled, setEnabled] = useState(initiallyEnabled)
  const [enabledDate, setEnabledDate] = useState(enabledAt ?? null)
  const [step, setStep] = useState<EnrolStep>('idle')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Disable flow state
  const [disableMode, setDisableMode] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disableCode, setDisableCode] = useState('')

  async function startEnrol() {
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/portal/security/totp/enroll', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setQrDataUrl(json.qrDataUrl)
      setSecret(json.secret)
      setStep('show-qr')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally { setSubmitting(false) }
  }

  async function confirmEnrol() {
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/portal/security/totp/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setRecoveryCodes(json.recoveryCodes)
      setStep('show-codes')
      setEnabled(true)
      setEnabledDate(new Date().toISOString())
      setCode('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally { setSubmitting(false) }
  }

  async function disable() {
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/portal/security/totp/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword, code: disableCode }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setEnabled(false)
      setEnabledDate(null)
      setDisableMode(false)
      setDisablePassword(''); setDisableCode('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally { setSubmitting(false) }
  }

  function finishCodesView() {
    setStep('idle')
    setRecoveryCodes([])
    setQrDataUrl(''); setSecret('')
  }

  if (step === 'show-codes' && recoveryCodes.length > 0) {
    return (
      <div className="space-y-4">
        <p className="font-sans text-sm text-ivory">
          2FA is now enabled. <span className="text-gold">Save these recovery codes</span> —
          each can be used once if you lose access to your authenticator. They will not be shown again.
        </p>
        <div className="border border-gold/30 bg-gold/5 p-5 grid grid-cols-2 gap-2 font-mono text-sm text-ivory">
          {recoveryCodes.map((c) => <div key={c}>{c}</div>)}
        </div>
        <Button onClick={finishCodesView}>I&apos;ve Saved Them</Button>
      </div>
    )
  }

  if (step === 'show-qr') {
    return (
      <div className="space-y-5">
        <p className="font-sans text-sm text-stone">
          Scan the QR code with Google Authenticator, 1Password, Authy, or any TOTP app.
          Then enter the 6-digit code to confirm.
        </p>
        {qrDataUrl && (
          <div className="bg-white inline-block p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="2FA QR code" width={240} height={240} />
          </div>
        )}
        <p className="font-sans text-[0.6rem] text-stone">
          Or enter this key manually: <span className="text-ivory font-mono">{secret}</span>
        </p>
        <div>
          <label className={LABEL_CLASS}>6-digit code</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={FIELD_CLASS}
            placeholder="123456"
          />
        </div>
        {error && <p className="font-sans text-xs text-red-400">{error}</p>}
        <div className="flex gap-3">
          <Button onClick={confirmEnrol} disabled={submitting || code.length < 6}>
            {submitting ? 'Verifying…' : 'Enable 2FA'}
          </Button>
          <Button variant="secondary" onClick={() => { setStep('idle'); setError(''); setCode('') }}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  if (enabled && disableMode) {
    return (
      <div className="space-y-4">
        <p className="font-sans text-sm text-stone">
          Confirm your password and a current 2FA code to disable two-factor authentication.
        </p>
        <div>
          <label className={LABEL_CLASS}>Password</label>
          <input type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} className={FIELD_CLASS} />
        </div>
        <div>
          <label className={LABEL_CLASS}>6-digit code (or recovery code)</label>
          <input type="text" value={disableCode} onChange={(e) => setDisableCode(e.target.value)} className={FIELD_CLASS} />
        </div>
        {error && <p className="font-sans text-xs text-red-400">{error}</p>}
        <div className="flex gap-3">
          <Button onClick={disable} disabled={submitting || !disablePassword || !disableCode}>
            {submitting ? 'Disabling…' : 'Disable 2FA'}
          </Button>
          <Button variant="secondary" onClick={() => { setDisableMode(false); setError(''); setDisablePassword(''); setDisableCode('') }}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  if (enabled) {
    return (
      <div className="space-y-3">
        <p className="font-sans text-sm text-ivory">
          Two-factor authentication is <span className="text-gold">enabled</span>
          {enabledDate && (
            <> since {new Date(enabledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
          )}.
        </p>
        <p className="font-sans text-xs text-stone">
          A code from your authenticator app will be required at every sign-in.
        </p>
        <button
          onClick={() => setDisableMode(true)}
          className="font-sans text-xs uppercase tracking-widest text-stone hover:text-red-400 transition-colors"
        >
          Disable 2FA
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="font-sans text-sm text-stone">
        Add a second authentication factor using an authenticator app. Strongly recommended.
      </p>
      {error && <p className="font-sans text-xs text-red-400">{error}</p>}
      <Button onClick={startEnrol} disabled={submitting}>
        {submitting ? 'Starting…' : 'Enable 2FA'}
      </Button>
    </div>
  )
}
