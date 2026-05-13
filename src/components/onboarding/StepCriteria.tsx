'use client'

import { useState } from 'react'
import { stepCriteriaSchema, VALID_STRATEGIES, VALID_BUYER_TYPES } from '@/lib/schemas/onboarding'
import { Button } from '@/components/ui/Button'

const FIELD_CLASS =
  'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold focus-visible:ring-1 focus-visible:ring-gold transition-colors'
const LABEL_CLASS =
  'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

interface Props {
  data: { budgetMin: number; budgetMax: number; strategy: string; buyerType: string; targetAreas: string }
  onChange: (data: Props['data']) => void
  onNext: () => void
  onBack: () => void
}

const STRATEGY_LABELS: Record<string, string> = {
  BTL: 'Buy To Let (BTL)',
  HMO: 'HMO',
  Flip: 'Flip',
  Any: 'Any Strategy',
}

export function StepCriteria({ data, onChange, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  function handleNext() {
    const result = stepCriteriaSchema.safeParse(data)
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors)
      return
    }
    setErrors({})
    onNext()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={LABEL_CLASS}>Minimum Budget (£)</label>
          <input
            type="number"
            required
            value={data.budgetMin || ''}
            onChange={(e) => onChange({ ...data, budgetMin: Number(e.target.value) })}
            className={FIELD_CLASS}
            placeholder="100000"
          />
          {errors.budgetMin && <p className="font-sans text-xs text-gold mt-1">{errors.budgetMin[0]}</p>}
        </div>
        <div>
          <label className={LABEL_CLASS}>Maximum Budget (£)</label>
          <input
            type="number"
            required
            value={data.budgetMax || ''}
            onChange={(e) => onChange({ ...data, budgetMax: Number(e.target.value) })}
            className={FIELD_CLASS}
            placeholder="300000"
          />
          {errors.budgetMax && <p className="font-sans text-xs text-gold mt-1">{errors.budgetMax[0]}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={LABEL_CLASS}>Preferred Strategy</label>
          <select value={data.strategy} onChange={(e) => onChange({ ...data, strategy: e.target.value })} className={FIELD_CLASS}>
            {VALID_STRATEGIES.map((s) => (
              <option key={s} value={s}>{STRATEGY_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS}>Buyer Type</label>
          <select value={data.buyerType} onChange={(e) => onChange({ ...data, buyerType: e.target.value })} className={FIELD_CLASS}>
            {VALID_BUYER_TYPES.map((t) => (
              <option key={t} value={t}>{t === 'cash' ? 'Cash Buyer' : 'Mortgage Buyer'}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={LABEL_CLASS}>Target Areas</label>
        <input
          type="text"
          required
          value={data.targetAreas}
          onChange={(e) => onChange({ ...data, targetAreas: e.target.value })}
          className={FIELD_CLASS}
          placeholder="Manchester, Leeds, Sheffield"
        />
        {errors.targetAreas && <p className="font-sans text-xs text-gold mt-1">{errors.targetAreas[0]}</p>}
      </div>
      <div className="flex justify-between">
        <Button onClick={onBack} variant="secondary">← Back</Button>
        <Button onClick={handleNext}>Next →</Button>
      </div>
    </div>
  )
}
