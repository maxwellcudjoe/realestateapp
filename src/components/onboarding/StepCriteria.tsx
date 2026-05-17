'use client'

import { useState } from 'react'
import { stepCriteriaSchema, VALID_BUYER_TYPES } from '@/lib/schemas/onboarding'
import { STRATEGIES } from '@/lib/strategies'
import { Button } from '@/components/ui/Button'
import { TargetAreaPicker } from './TargetAreaPicker'

const FIELD_CLASS =
  'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold focus-visible:ring-1 focus-visible:ring-gold transition-colors'
const LABEL_CLASS =
  'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

interface Props {
  data: { budgetMin: number; budgetMax: number; strategies: string[]; buyerType: string; targetAreaCodes: string[] }
  onChange: (data: Props['data']) => void
  onNext: () => void
  onBack: () => void
}

export function StepCriteria({ data, onChange, onNext, onBack }: Props) {
  function toggleStrategy(code: string) {
    const set = new Set(data.strategies)
    if (set.has(code)) set.delete(code)
    else set.add(code)
    onChange({ ...data, strategies: Array.from(set) })
  }

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
      <div>
        <label className={LABEL_CLASS}>Investment Strategies (select all that apply)</label>
        <div className="space-y-2">
          {STRATEGIES.map((s) => (
            <label key={s.code} className="flex items-start gap-3 cursor-pointer group p-3 border border-carbon hover:border-gold/40 transition-colors">
              <input
                type="checkbox"
                checked={data.strategies.includes(s.code)}
                onChange={() => toggleStrategy(s.code)}
                className="mt-1 accent-gold"
              />
              <div>
                <p className="font-sans text-sm text-ivory">{s.label}</p>
                <p className="font-sans text-[0.65rem] text-stone mt-0.5">{s.description}</p>
              </div>
            </label>
          ))}
        </div>
        {errors.strategies && <p className="font-sans text-xs text-gold mt-1">{errors.strategies[0]}</p>}
      </div>

      <div>
        <label className={LABEL_CLASS}>Buyer Type</label>
        <select value={data.buyerType} onChange={(e) => onChange({ ...data, buyerType: e.target.value })} className={FIELD_CLASS}>
          {VALID_BUYER_TYPES.map((t) => (
            <option key={t} value={t}>{t === 'cash' ? 'Cash Buyer' : 'Mortgage Buyer'}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={LABEL_CLASS}>Target Areas</label>
        <TargetAreaPicker
          value={data.targetAreaCodes}
          onChange={(codes) => onChange({ ...data, targetAreaCodes: codes })}
        />
        {errors.targetAreaCodes && <p className="font-sans text-xs text-gold mt-1">{errors.targetAreaCodes[0]}</p>}
      </div>
      <div className="flex justify-between">
        <Button onClick={onBack} variant="secondary">← Back</Button>
        <Button onClick={handleNext}>Next →</Button>
      </div>
    </div>
  )
}
