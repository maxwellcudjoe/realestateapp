'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { WizardProgress } from '@/components/onboarding/WizardProgress'
import { StepAccount } from '@/components/onboarding/StepAccount'
import { StepPersonal } from '@/components/onboarding/StepPersonal'
import { StepCompliance } from '@/components/onboarding/StepCompliance'
import { StepCriteria } from '@/components/onboarding/StepCriteria'
import { StepReview } from '@/components/onboarding/StepReview'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitErrors, setSubmitErrors] = useState<Record<string, string[]>>({})
  const [turnstileToken, setTurnstileToken] = useState<string>('')

  const [account, setAccount] = useState({ email: '', password: '', confirmPassword: '' })
  const [personal, setPersonal] = useState({ firstName: '', lastName: '', phone: '', addressLine1: '', city: '', postcode: '' })
  const [compliance, setCompliance] = useState({
    dateOfBirth: '', nationality: 'GB', taxResidency: 'GB',
    niNumber: '', isPep: false, pepDetails: '',
    sourceOfFunds: '', sourceOfFundsDetail: '',
  })
  const [criteria, setCriteria] = useState({ budgetMin: 0, budgetMax: 0, strategy: 'BTL', buyerType: 'cash', targetAreas: '' })
  const [agreements, setAgreements] = useState({ agreedToTerms: false, agreedToPrivacy: false, agreedToAccuracy: false, agreedToAge: false, agreedToMarketing: false })

  function handleAgreement(field: string, value: boolean) {
    setAgreements((a) => ({ ...a, [field]: value }))
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
