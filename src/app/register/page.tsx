'use client'

import { useState } from 'react'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Button } from '@/components/ui/Button'

const FIELD_CLASS =
  'w-full bg-[#1f1f1f] border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'

const LABEL_CLASS =
  'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', budget: '',
    strategy: 'BTL', buyerType: 'Cash', areas: '',
  })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [serverError, setServerError] = useState('')

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrors({})
    setServerError('')

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const json = await res.json()

    if (!res.ok) {
      if (json.errors) setErrors(json.errors)
      else setServerError(json.error ?? 'Something went wrong.')
      setStatus('error')
    } else {
      setStatus('success')
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-obsidian pt-[72px] flex items-center justify-center px-8">
        <div className="text-center max-w-lg">
          <p className="font-sans text-xs uppercase tracking-widest text-gold mb-6">Registration Received</p>
          <h1 className="font-serif text-4xl font-light text-ivory mb-6">
            Thank you for registering.
          </h1>
          <p className="font-sans text-sm font-light text-stone leading-relaxed">
            We'll match your criteria against our current deal pipeline and be in touch shortly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-obsidian pt-[72px]">
      <div className="max-w-2xl mx-auto px-8 py-16">
        <SectionLabel className="mb-4">Join Our Buyer List</SectionLabel>
        <h1 className="font-serif text-5xl font-light text-ivory mb-3">
          Register Your Investment Criteria
        </h1>
        <p className="font-sans text-sm font-light text-stone mb-12 leading-relaxed">
          Every registration becomes a buyer profile. We match your criteria against every deal we source.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={LABEL_CLASS}>Full Name</label>
              <input type="text" required value={form.name} onChange={update('name')} className={FIELD_CLASS} placeholder="John Smith" />
              {errors.name && <p className="font-sans text-xs text-gold mt-1">{errors.name[0]}</p>}
            </div>
            <div>
              <label className={LABEL_CLASS}>Email Address</label>
              <input type="email" required value={form.email} onChange={update('email')} className={FIELD_CLASS} placeholder="john@example.com" />
              {errors.email && <p className="font-sans text-xs text-gold mt-1">{errors.email[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={LABEL_CLASS}>Phone Number</label>
              <input type="tel" value={form.phone} onChange={update('phone')} className={FIELD_CLASS} placeholder="+44 7700 000000" />
            </div>
            <div>
              <label className={LABEL_CLASS}>Investment Budget</label>
              <input type="text" required value={form.budget} onChange={update('budget')} className={FIELD_CLASS} placeholder="e.g. £150,000 – £300,000" />
              {errors.budget && <p className="font-sans text-xs text-gold mt-1">{errors.budget[0]}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={LABEL_CLASS}>Preferred Strategy</label>
              <select value={form.strategy} onChange={update('strategy')} className={FIELD_CLASS}>
                <option value="BTL">Buy To Let (BTL)</option>
                <option value="HMO">HMO</option>
                <option value="Flip">Flip</option>
                <option value="All">All Strategies</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Buyer Type</label>
              <select value={form.buyerType} onChange={update('buyerType')} className={FIELD_CLASS}>
                <option value="Cash">Cash Buyer</option>
                <option value="Mortgage">Mortgage Buyer</option>
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Preferred Areas</label>
            <input type="text" required value={form.areas} onChange={update('areas')} className={FIELD_CLASS} placeholder="e.g. Manchester, Leeds, Birmingham" />
            {errors.areas && <p className="font-sans text-xs text-gold mt-1">{errors.areas[0]}</p>}
          </div>

          {serverError && (
            <p className="font-sans text-xs text-red-400">{serverError}</p>
          )}

          <Button type="submit" fullWidth disabled={status === 'loading'} className="mt-2 py-4">
            {status === 'loading' ? 'Submitting…' : 'Submit Registration'}
          </Button>

          <p className="font-sans text-[0.55rem] text-[#3a3a3a] text-center leading-relaxed">
            Your details are kept strictly confidential and used only to match you with suitable investment opportunities.
          </p>
        </form>
      </div>
    </div>
  )
}
