'use client'

import { useState } from 'react'
import { stepAccountSchema } from '@/lib/schemas/onboarding'

const FIELD_CLASS =
  'w-full bg-[#1f1f1f] border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'
const LABEL_CLASS =
  'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

interface Props {
  data: { email: string; password: string; confirmPassword: string }
  onChange: (data: Props['data']) => void
  onNext: () => void
}

export function StepAccount({ data, onChange, onNext }: Props) {
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [checking, setChecking] = useState(false)

  async function handleNext() {
    const result = stepAccountSchema.safeParse(data)
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors)
      return
    }
    setErrors({})

    // Check duplicate email
    setChecking(true)
    try {
      const res = await fetch('/api/onboarding/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })
      const json = await res.json()
      if (json.exists) {
        setErrors({ email: ['An account with this email already exists'] })
        return
      }
    } catch {
      // If check fails, let the final submit handle it
    } finally {
      setChecking(false)
    }

    onNext()
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className={LABEL_CLASS}>Email Address</label>
        <input
          type="email"
          required
          value={data.email}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
          className={FIELD_CLASS}
          placeholder="your@email.com"
        />
        {errors.email && <p className="font-sans text-xs text-gold mt-1">{errors.email[0]}</p>}
      </div>
      <div>
        <label className={LABEL_CLASS}>Password</label>
        <input
          type="password"
          required
          value={data.password}
          onChange={(e) => onChange({ ...data, password: e.target.value })}
          className={FIELD_CLASS}
          placeholder="Minimum 8 characters"
        />
        {errors.password && <p className="font-sans text-xs text-gold mt-1">{errors.password[0]}</p>}
      </div>
      <div>
        <label className={LABEL_CLASS}>Confirm Password</label>
        <input
          type="password"
          required
          value={data.confirmPassword}
          onChange={(e) => onChange({ ...data, confirmPassword: e.target.value })}
          className={FIELD_CLASS}
          placeholder="Repeat your password"
        />
        {errors.confirmPassword && (
          <p className="font-sans text-xs text-gold mt-1">{errors.confirmPassword[0]}</p>
        )}
      </div>
      <button
        type="button"
        onClick={handleNext}
        disabled={checking}
        className="self-end px-8 py-3.5 text-xs font-semibold uppercase tracking-widest border border-gold text-gold hover:bg-gold hover:text-obsidian transition-colors disabled:opacity-50"
      >
        {checking ? 'Checking…' : 'Next →'}
      </button>
    </div>
  )
}
