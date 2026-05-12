'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { WizardProgress } from '@/components/onboarding/WizardProgress'
import { StepAccount } from '@/components/onboarding/StepAccount'
import { StepPersonal } from '@/components/onboarding/StepPersonal'
import { StepCriteria } from '@/components/onboarding/StepCriteria'
import { StepReview } from '@/components/onboarding/StepReview'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitErrors, setSubmitErrors] = useState<Record<string, string[]>>({})

  const [account, setAccount] = useState({ email: '', password: '', confirmPassword: '' })
  const [personal, setPersonal] = useState({ firstName: '', lastName: '', phone: '', addressLine1: '', city: '', postcode: '' })
  const [criteria, setCriteria] = useState({ budgetMin: 0, budgetMax: 0, strategy: 'BTL', buyerType: 'cash', targetAreas: '' })
  const [agreements, setAgreements] = useState({ agreedToTerms: false, agreedToPrivacy: false, agreedToAccuracy: false, agreedToAge: false })

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
      ...criteria,
      ...agreements,
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

      // Auto sign-in after successful registration
      await signIn('credentials', {
        email: account.email,
        password: account.password,
        redirect: false,
      })

      router.push('/portal/status')
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
          {step === 2 && 'Investment Criteria'}
          {step === 3 && 'Review & Submit'}
        </h1>

        <WizardProgress current={step} />

        {step === 0 && <StepAccount data={account} onChange={setAccount} onNext={() => setStep(1)} />}
        {step === 1 && <StepPersonal data={personal} onChange={setPersonal} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && <StepCriteria data={criteria} onChange={setCriteria} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && (
          <StepReview
            account={account}
            personal={personal}
            criteria={criteria}
            agreements={agreements}
            onAgreementChange={handleAgreement}
            onBack={() => setStep(2)}
            onSubmit={handleSubmit}
            submitting={submitting}
            errors={submitErrors}
          />
        )}
      </div>
    </div>
  )
}
