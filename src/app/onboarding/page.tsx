'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { WizardProgress } from '@/components/onboarding/WizardProgress'
import { StepAccount } from '@/components/onboarding/StepAccount'
import { StepPersonal } from '@/components/onboarding/StepPersonal'
import { StepCompliance } from '@/components/onboarding/StepCompliance'
import { StepCriteria } from '@/components/onboarding/StepCriteria'
import { StepReview } from '@/components/onboarding/StepReview'

const DRAFT_KEY = 'rb-onboarding-draft-v1'

interface Draft {
  step: number
  personal: import('@/components/onboarding/StepPersonal').PersonalData
  compliance: { dateOfBirth: string; nationality: string; taxResidency: string; niNumber: string; isPep: boolean; pepDetails: string; sourceOfFunds: string; sourceOfFundsDetail: string }
  criteria: import('@/components/onboarding/StepCriteria').CriteriaData
  agreements: { agreedToTerms: boolean; agreedToPrivacy: boolean; agreedToAccuracy: boolean; agreedToAge: boolean; agreedToMarketing: boolean }
  emailHint: string  // email only — never password
}

function loadDraft(): Draft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as Draft) : null
  } catch {
    return null
  }
}

function clearDraft() {
  if (typeof window !== 'undefined') localStorage.removeItem(DRAFT_KEY)
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitErrors, setSubmitErrors] = useState<Record<string, string[]>>({})
  const [turnstileToken, setTurnstileToken] = useState<string>('')

  const [account, setAccount] = useState({ email: '', password: '', confirmPassword: '' })
  const [personal, setPersonal] = useState<import('@/components/onboarding/StepPersonal').PersonalData>({
    firstName: '', lastName: '', phone: '', addressLine1: '', city: '', postcode: '',
    entityType: 'INDIVIDUAL', companyName: '', companyNumber: '', vatNumber: '', companyAddress: '',
  })
  const [compliance, setCompliance] = useState({
    dateOfBirth: '', nationality: 'GB', taxResidency: 'GB',
    niNumber: '', isPep: false, pepDetails: '',
    sourceOfFunds: '', sourceOfFundsDetail: '',
  })
  const [criteria, setCriteria] = useState<import('@/components/onboarding/StepCriteria').CriteriaData>({
    budgetMin: 0, budgetMax: 0, strategies: ['BTL'], buyerType: 'cash', targetAreaCodes: [],
    experienceLevel: '', timelineToBuy: '', mortgageStatus: 'NONE',
    mortgageLender: '', maxLtv: undefined, depositAvailable: undefined, referralSource: '',
  })
  const [agreements, setAgreements] = useState({ agreedToTerms: false, agreedToPrivacy: false, agreedToAccuracy: false, agreedToAge: false, agreedToMarketing: false })
  const [draftRestored, setDraftRestored] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Restore draft on first mount
  useEffect(() => {
    const draft = loadDraft()
    if (draft) {
      setStep(Math.min(draft.step, 3)) // don't auto-jump to Review
      setPersonal(draft.personal)
      setCompliance(draft.compliance)
      setCriteria(draft.criteria)
      setAgreements(draft.agreements)
      if (draft.emailHint) setAccount((a) => ({ ...a, email: draft.emailHint }))
      setDraftRestored(true)
    }
    setHydrated(true)
  }, [])

  // Persist draft on change (skip until hydrated to avoid clobbering a load)
  useEffect(() => {
    if (!hydrated) return
    if (typeof window === 'undefined') return
    const draft: Draft = {
      step, personal, compliance, criteria, agreements,
      emailHint: account.email,
    }
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) } catch { /* ignore quota */ }
  }, [hydrated, step, personal, compliance, criteria, agreements, account.email])

  function handleAgreement(field: string, value: boolean) {
    setAgreements((a) => ({ ...a, [field]: value }))
  }

  function discardDraft() {
    clearDraft()
    setDraftRestored(false)
    setStep(0)
    setPersonal({ firstName: '', lastName: '', phone: '', addressLine1: '', city: '', postcode: '', entityType: 'INDIVIDUAL', companyName: '', companyNumber: '', vatNumber: '', companyAddress: '' })
    setCompliance({ dateOfBirth: '', nationality: 'GB', taxResidency: 'GB', niNumber: '', isPep: false, pepDetails: '', sourceOfFunds: '', sourceOfFundsDetail: '' })
    setCriteria({ budgetMin: 0, budgetMax: 0, strategies: ['BTL'], buyerType: 'cash', targetAreaCodes: [], experienceLevel: '', timelineToBuy: '', mortgageStatus: 'NONE', mortgageLender: '', maxLtv: undefined, depositAvailable: undefined, referralSource: '' })
    setAgreements({ agreedToTerms: false, agreedToPrivacy: false, agreedToAccuracy: false, agreedToAge: false, agreedToMarketing: false })
    setAccount({ email: '', password: '', confirmPassword: '' })
  }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitErrors({})

    const payload = {
      email: account.email,
      password: account.password,
      ...personal,
      ...compliance,
      ...criteria,
      ...agreements,
      turnstileToken,
    }

    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (!res.ok) {
        if (json.errors) setSubmitErrors(json.errors)
        else setSubmitErrors({ _form: [json.error ?? 'Something went wrong.'] })
        setSubmitting(false)
        return
      }

      // Email verification required before sign-in — redirect to "check your inbox" page.
      clearDraft()
      router.push(`/verify-email-sent?email=${encodeURIComponent(account.email)}`)
    } catch {
      setSubmitErrors({ _form: ['Network error. Please try again.'] })
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-obsidian pt-[72px]">
      <div className="max-w-2xl mx-auto px-8 py-16">
        <SectionLabel className="mb-4">Investor Onboarding</SectionLabel>
        <h1 className="font-serif text-5xl font-light text-ivory mb-8">
          {step === 0 && 'Create Your Account'}
          {step === 1 && 'Personal Details'}
          {step === 2 && 'Compliance & AML'}
          {step === 3 && 'Investment Criteria'}
          {step === 4 && 'Review & Submit'}
        </h1>

        {draftRestored && (
          <div className="border border-gold bg-gold/5 p-4 mb-6 flex items-center justify-between gap-4">
            <p className="font-sans text-xs text-gold">
              We restored your previous application. Pick up where you left off, or
              <button type="button" onClick={discardDraft} className="ml-1 underline hover:text-ivory transition-colors">
                start over
              </button>.
            </p>
            <button type="button" onClick={() => setDraftRestored(false)} className="font-sans text-xs text-stone hover:text-ivory" aria-label="Dismiss">×</button>
          </div>
        )}

        <WizardProgress current={step} />

        {step === 0 && <StepAccount data={account} onChange={setAccount} onNext={() => setStep(1)} />}
        {step === 1 && <StepPersonal data={personal} onChange={setPersonal} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && <StepCompliance data={compliance} onChange={setCompliance} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <StepCriteria data={criteria} onChange={setCriteria} onNext={() => setStep(4)} onBack={() => setStep(2)} />}
        {step === 4 && (
          <StepReview
            account={account}
            personal={personal}
            criteria={criteria}
            agreements={agreements}
            onAgreementChange={handleAgreement}
            onTurnstileToken={setTurnstileToken}
            turnstileToken={turnstileToken}
            onBack={() => setStep(3)}
            onSubmit={handleSubmit}
            submitting={submitting}
            errors={submitErrors}
          />
        )}
      </div>
    </div>
  )
}
