'use client'

import { useState } from 'react'
import { stepPersonalSchema } from '@/lib/schemas/onboarding'
import { Button } from '@/components/ui/Button'

const FIELD_CLASS =
  'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold focus-visible:ring-1 focus-visible:ring-gold transition-colors'
const LABEL_CLASS =
  'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

interface Props {
  data: { firstName: string; lastName: string; phone: string; addressLine1: string; city: string; postcode: string }
  onChange: (data: Props['data']) => void
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

  return (
    <div className="flex flex-col gap-5">
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
