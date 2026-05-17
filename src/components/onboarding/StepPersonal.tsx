'use client'

import { useState } from 'react'
import { stepPersonalSchema } from '@/lib/schemas/onboarding'
import { ENTITY_TYPES } from '@/lib/compliance'
import { Button } from '@/components/ui/Button'

const FIELD_CLASS =
  'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold focus-visible:ring-1 focus-visible:ring-gold transition-colors'
const LABEL_CLASS =
  'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

export interface PersonalData {
  firstName: string
  lastName: string
  phone: string
  addressLine1: string
  city: string
  postcode: string
  entityType: string
  companyName: string
  companyNumber: string
  vatNumber: string
  companyAddress: string
}

interface Props {
  data: PersonalData
  onChange: (data: PersonalData) => void
  onNext: () => void
  onBack: () => void
}

export function StepPersonal({ data, onChange, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  function handleNext() {
    const result = stepPersonalSchema.safeParse(data)
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors)
      return
    }
    setErrors({})
    onNext()
  }

  const isCompany = data.entityType !== 'INDIVIDUAL'

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className={LABEL_CLASS}>Buying as</label>
        <select
          value={data.entityType}
          onChange={(e) => onChange({ ...data, entityType: e.target.value })}
          className={FIELD_CLASS}
        >
          {ENTITY_TYPES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        {errors.entityType && <p className="font-sans text-xs text-gold mt-1">{errors.entityType[0]}</p>}
      </div>

      {isCompany && (
        <div className="border border-carbon p-5 space-y-5">
          <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">Entity Details</p>
          <div>
            <label className={LABEL_CLASS}>Company / Entity Name</label>
            <input type="text" required value={data.companyName} onChange={(e) => onChange({ ...data, companyName: e.target.value })} className={FIELD_CLASS} placeholder="e.g. Smith Property Investments Ltd" />
            {errors.companyName && <p className="font-sans text-xs text-gold mt-1">{errors.companyName[0]}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={LABEL_CLASS}>{data.entityType === 'LTD_COMPANY' ? 'Companies House Number' : 'Registration Number (if any)'}</label>
              <input type="text" value={data.companyNumber} onChange={(e) => onChange({ ...data, companyNumber: e.target.value.toUpperCase() })} className={FIELD_CLASS} placeholder="12345678 or SC123456" />
              {errors.companyNumber && <p className="font-sans text-xs text-gold mt-1">{errors.companyNumber[0]}</p>}
            </div>
            <div>
              <label className={LABEL_CLASS}>VAT Number (optional)</label>
              <input type="text" value={data.vatNumber} onChange={(e) => onChange({ ...data, vatNumber: e.target.value.toUpperCase() })} className={FIELD_CLASS} placeholder="GB123456789" />
            </div>
          </div>
          <div>
            <label className={LABEL_CLASS}>Registered Address (if different from personal address)</label>
            <input type="text" value={data.companyAddress} onChange={(e) => onChange({ ...data, companyAddress: e.target.value })} className={FIELD_CLASS} placeholder="Optional" />
          </div>
        </div>
      )}

      <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mt-4">Personal Details {isCompany && <span className="text-stone normal-case tracking-normal">(of the company&apos;s lead contact / director)</span>}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={LABEL_CLASS}>First Name</label>
          <input type="text" required value={data.firstName} onChange={(e) => onChange({ ...data, firstName: e.target.value })} className={FIELD_CLASS} placeholder="Jane" />
          {errors.firstName && <p className="font-sans text-xs text-gold mt-1">{errors.firstName[0]}</p>}
        </div>
        <div>
          <label className={LABEL_CLASS}>Last Name</label>
          <input type="text" required value={data.lastName} onChange={(e) => onChange({ ...data, lastName: e.target.value })} className={FIELD_CLASS} placeholder="Smith" />
          {errors.lastName && <p className="font-sans text-xs text-gold mt-1">{errors.lastName[0]}</p>}
        </div>
      </div>
      <div>
        <label className={LABEL_CLASS}>Phone Number</label>
        <input type="tel" required value={data.phone} onChange={(e) => onChange({ ...data, phone: e.target.value })} className={FIELD_CLASS} placeholder="+44 7700 000 000" />
        {errors.phone && <p className="font-sans text-xs text-gold mt-1">{errors.phone[0]}</p>}
      </div>
      <div>
        <label className={LABEL_CLASS}>Address</label>
        <input type="text" required value={data.addressLine1} onChange={(e) => onChange({ ...data, addressLine1: e.target.value })} className={FIELD_CLASS} placeholder="123 Main Street" />
        {errors.addressLine1 && <p className="font-sans text-xs text-gold mt-1">{errors.addressLine1[0]}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={LABEL_CLASS}>City</label>
          <input type="text" required value={data.city} onChange={(e) => onChange({ ...data, city: e.target.value })} className={FIELD_CLASS} placeholder="London" />
          {errors.city && <p className="font-sans text-xs text-gold mt-1">{errors.city[0]}</p>}
        </div>
        <div>
          <label className={LABEL_CLASS}>Postcode</label>
          <input type="text" required value={data.postcode} onChange={(e) => onChange({ ...data, postcode: e.target.value })} className={FIELD_CLASS} placeholder="E1 6AN" />
          {errors.postcode && <p className="font-sans text-xs text-gold mt-1">{errors.postcode[0]}</p>}
        </div>
      </div>
      <div className="flex justify-between">
        <Button onClick={onBack} variant="secondary">← Back</Button>
        <Button onClick={handleNext}>Next →</Button>
      </div>
    </div>
  )
}
