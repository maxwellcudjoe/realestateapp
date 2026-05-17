'use client'

import Link from 'next/link'
import { Turnstile } from '@marsidev/react-turnstile'
import { Button } from '@/components/ui/Button'
import { areaLabel } from '@/lib/target-areas'

const LABEL_CLASS = 'font-sans text-[0.6rem] uppercase tracking-widest text-stone'
const VALUE_CLASS = 'font-sans text-sm text-ivory mt-0.5'

interface Props {
  account: { email: string }
  personal: { firstName: string; lastName: string; phone: string; addressLine1: string; city: string; postcode: string }
  criteria: import('./StepCriteria').CriteriaData
  agreements: { agreedToTerms: boolean; agreedToPrivacy: boolean; agreedToAccuracy: boolean; agreedToAge: boolean; agreedToMarketing: boolean }
  onAgreementChange: (field: string, value: boolean) => void
  onTurnstileToken: (token: string) => void
  turnstileToken: string
  onBack: () => void
  onSubmit: () => void
  submitting: boolean
  errors: Record<string, string[]>
}

export function StepReview({
  account, personal, criteria, agreements,
  onAgreementChange, onTurnstileToken, turnstileToken,
  onBack, onSubmit, submitting, errors,
}: Props) {
  const fmt = (n: number) => `£${n.toLocaleString('en-GB')}`
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  // Submit blocked until CAPTCHA solved, unless Turnstile not yet configured.
  const captchaReady = !turnstileSiteKey || Boolean(turnstileToken)

  return (
    <div className="flex flex-col gap-8">
      {/* Summary */}
      <div className="border border-carbon p-6 space-y-4">
        <h3 className="font-serif text-xl text-ivory mb-4">Application Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><p className={LABEL_CLASS}>Email</p><p className={VALUE_CLASS}>{account.email}</p></div>
          <div><p className={LABEL_CLASS}>Name</p><p className={VALUE_CLASS}>{personal.firstName} {personal.lastName}</p></div>
          <div><p className={LABEL_CLASS}>Phone</p><p className={VALUE_CLASS}>{personal.phone}</p></div>
          <div><p className={LABEL_CLASS}>Address</p><p className={VALUE_CLASS}>{personal.addressLine1}, {personal.city} {personal.postcode}</p></div>
          <div><p className={LABEL_CLASS}>Budget</p><p className={VALUE_CLASS}>{fmt(criteria.budgetMin)} – {fmt(criteria.budgetMax)}</p></div>
          <div><p className={LABEL_CLASS}>Strategies</p><p className={VALUE_CLASS}>{criteria.strategies.join(', ')}</p></div>
          <div><p className={LABEL_CLASS}>Buyer Type</p><p className={VALUE_CLASS}>{criteria.buyerType}</p></div>
          <div className="sm:col-span-2"><p className={LABEL_CLASS}>Target Areas</p><p className={VALUE_CLASS}>{criteria.targetAreaCodes.map(areaLabel).join(', ') || '—'}</p></div>
        </div>
      </div>

      {/* Agreements */}
      <div className="space-y-3">
        {([
          ['agreedToAccuracy', 'I confirm the information above is accurate and complete'],
          ['agreedToTerms', <>I have read and agree to the <Link href="/terms" target="_blank" className="text-gold hover:text-ivory transition-colors">Terms &amp; Conditions</Link></>],
          ['agreedToPrivacy', <>I have read and agree to the <Link href="/privacy" target="_blank" className="text-gold hover:text-ivory transition-colors">Privacy Policy</Link></>],
          ['agreedToAge', 'I confirm I am over 18 and have legal authority to purchase UK property'],
          ['agreedToMarketing', <span key="marketing-label" className="text-stone/70">I&apos;d like to receive deal alerts and market updates (optional — you can unsubscribe at any time)</span>],
        ] as [string, React.ReactNode][]).map(([field, label]) => (
          <label key={field} className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements[field as keyof typeof agreements]}
              onChange={(e) => onAgreementChange(field, e.target.checked)}
              className="mt-1 accent-gold"
            />
            <span className="font-sans text-sm text-stone group-hover:text-ivory transition-colors">{label}</span>
          </label>
        ))}
        {Object.entries(errors).filter(([k]) => k.startsWith('agreed')).map(([k, msgs]) => (
          <p key={k} className="font-sans text-xs text-gold ml-7">{msgs[0]}</p>
        ))}
      </div>

      {/* CAPTCHA */}
      {turnstileSiteKey && (
        <div>
          <Turnstile
            siteKey={turnstileSiteKey}
            onSuccess={onTurnstileToken}
            onError={() => onTurnstileToken('')}
            onExpire={() => onTurnstileToken('')}
            options={{ theme: 'dark' }}
          />
        </div>
      )}

      {/* Server error */}
      {errors._form && <p className="font-sans text-xs text-red-400">{errors._form[0]}</p>}

      <div className="flex justify-between">
        <Button onClick={onBack} variant="secondary">← Back</Button>
        <Button onClick={onSubmit} disabled={submitting || !captchaReady}>
          {submitting ? 'Submitting…' : !captchaReady ? 'Complete CAPTCHA' : 'Submit Application'}
        </Button>
      </div>
    </div>
  )
}
