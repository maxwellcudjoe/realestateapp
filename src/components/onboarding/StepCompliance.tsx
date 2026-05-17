'use client'

import { useState } from 'react'
import { stepComplianceSchema } from '@/lib/schemas/onboarding'
import { COUNTRIES, SOURCE_OF_FUNDS_OPTIONS } from '@/lib/compliance'
import { Button } from '@/components/ui/Button'

const FIELD_CLASS =
  'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold focus-visible:ring-1 focus-visible:ring-gold transition-colors'
const LABEL_CLASS =
  'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

export interface ComplianceData {
  dateOfBirth: string
  nationality: string
  taxResidency: string
  niNumber: string
  isPep: boolean
  pepDetails: string
  sourceOfFunds: string
  sourceOfFundsDetail: string
}

interface Props {
  data: ComplianceData
  onChange: (data: ComplianceData) => void
  onNext: () => void
  onBack: () => void
}

export function StepCompliance({ data, onChange, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  function handleNext() {
    const result = stepComplianceSchema.safeParse(data)
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors)
      return
    }
    setErrors({})
    onNext()
  }

  const showNi = data.taxResidency === 'GB'
  const showOtherSourceDetail = data.sourceOfFunds === 'OTHER'

  return (
    <div className="flex flex-col gap-5">
      <p className="font-sans text-xs text-stone">
        These details are required under UK Money Laundering Regulations (MLR 2017).
        Your data is encrypted, kept confidential, and used solely for compliance and tax purposes.
      </p>

      <div>
        <label className={LABEL_CLASS}>Date of Birth</label>
        <input
          type="date"
          required
          value={data.dateOfBirth}
          onChange={(e) => onChange({ ...data, dateOfBirth: e.target.value })}
          className={FIELD_CLASS}
        />
        {errors.dateOfBirth && <p className="font-sans text-xs text-gold mt-1">{errors.dateOfBirth[0]}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={LABEL_CLASS}>Nationality</label>
          <select
            value={data.nationality}
            onChange={(e) => onChange({ ...data, nationality: e.target.value })}
            className={FIELD_CLASS}
          >
            <option value="" disabled>Select…</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          {errors.nationality && <p className="font-sans text-xs text-gold mt-1">{errors.nationality[0]}</p>}
        </div>
        <div>
          <label className={LABEL_CLASS}>Country of Tax Residency</label>
          <select
            value={data.taxResidency}
            onChange={(e) => onChange({ ...data, taxResidency: e.target.value })}
            className={FIELD_CLASS}
          >
            <option value="" disabled>Select…</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          {errors.taxResidency && <p className="font-sans text-xs text-gold mt-1">{errors.taxResidency[0]}</p>}
        </div>
      </div>

      {showNi && (
        <div>
          <label className={LABEL_CLASS}>National Insurance Number (optional)</label>
          <input
            type="text"
            value={data.niNumber}
            onChange={(e) => onChange({ ...data, niNumber: e.target.value.toUpperCase() })}
            className={FIELD_CLASS}
            placeholder="QQ123456C"
          />
          {errors.niNumber && <p className="font-sans text-xs text-gold mt-1">{errors.niNumber[0]}</p>}
          <p className="font-sans text-[0.6rem] text-stone mt-1">
            Required by HMRC if you become a UK landlord. You can add this later.
          </p>
        </div>
      )}

      <div>
        <label className={LABEL_CLASS}>Source of Funds</label>
        <select
          value={data.sourceOfFunds}
          onChange={(e) => onChange({ ...data, sourceOfFunds: e.target.value })}
          className={FIELD_CLASS}
        >
          <option value="" disabled>Select…</option>
          {SOURCE_OF_FUNDS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {errors.sourceOfFunds && <p className="font-sans text-xs text-gold mt-1">{errors.sourceOfFunds[0]}</p>}
      </div>

      {showOtherSourceDetail && (
        <div>
          <label className={LABEL_CLASS}>Please describe</label>
          <textarea
            value={data.sourceOfFundsDetail}
            onChange={(e) => onChange({ ...data, sourceOfFundsDetail: e.target.value })}
            rows={2}
            className={FIELD_CLASS}
            placeholder="e.g. Proceeds from a business sale in 2024"
          />
          {errors.sourceOfFundsDetail && <p className="font-sans text-xs text-gold mt-1">{errors.sourceOfFundsDetail[0]}</p>}
        </div>
      )}

      <div className="border-t border-carbon pt-5">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={data.isPep}
            onChange={(e) => onChange({ ...data, isPep: e.target.checked })}
            className="mt-1 accent-gold"
          />
          <div>
            <span className="font-sans text-sm text-ivory group-hover:text-gold transition-colors">
              I am a Politically Exposed Person (PEP) or closely associated with one
            </span>
            <p className="font-sans text-[0.6rem] text-stone mt-1 leading-relaxed">
              A PEP is someone holding (or who recently held) a prominent public function, or a close family member or associate.
              This does not exclude you from investing — it triggers Enhanced Due Diligence under MLR 2017.
            </p>
          </div>
        </label>

        {data.isPep && (
          <div className="mt-4 ml-7">
            <label className={LABEL_CLASS}>Brief details</label>
            <textarea
              value={data.pepDetails}
              onChange={(e) => onChange({ ...data, pepDetails: e.target.value })}
              rows={2}
              className={FIELD_CLASS}
              placeholder="e.g. Father is a former MP; I am a family member"
            />
            {errors.pepDetails && <p className="font-sans text-xs text-gold mt-1">{errors.pepDetails[0]}</p>}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button onClick={onBack} variant="secondary">← Back</Button>
        <Button onClick={handleNext}>Next →</Button>
      </div>
    </div>
  )
}
