'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { TargetAreaPicker } from '@/components/onboarding/TargetAreaPicker'
import { PostcodeLookup } from '@/components/onboarding/PostcodeLookup'
import { STRATEGIES } from '@/lib/strategies'
import {
  COUNTRIES, SOURCE_OF_FUNDS_OPTIONS,
  EXPERIENCE_LEVELS, TIMELINE_OPTIONS, MORTGAGE_STATUS_OPTIONS,
} from '@/lib/compliance'

const FIELD =
  'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'
const SECTION = 'font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4'

export interface ProfileData {
  phone: string
  addressLine1: string
  city: string
  postcode: string
  budgetMin: number
  budgetMax: number
  strategies: string[]
  buyerType: string
  targetAreaCodes: string[]
  experienceLevel: string
  timelineToBuy: string
  mortgageStatus: string
  mortgageLender: string
  maxLtv?: number
  depositAvailable?: number
  referralSource: string
  taxResidency: string
  niNumber: string
  sourceOfFunds: string
  sourceOfFundsDetail: string
  marketingConsent: boolean
  locked: {
    firstName: string
    lastName: string
    dateOfBirth: string | null
    nationality: string | null
    isPep: boolean
  }
}

export function ProfileEditForm({ initial }: { initial: ProfileData }) {
  const [data, setData] = useState<ProfileData>(initial)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [success, setSuccess] = useState(false)

  function update<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setData((d) => ({ ...d, [key]: value }))
    setSuccess(false)
  }
  function toggleStrategy(code: string) {
    const set = new Set(data.strategies)
    if (set.has(code)) set.delete(code); else set.add(code)
    update('strategies', Array.from(set))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setErrors({}); setSuccess(false)
    try {
      const res = await fetch('/api/portal/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setErrors(json.errors ?? { _form: [json.error ?? 'Update failed'] })
      } else {
        setSuccess(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch {
      setErrors({ _form: ['Network error'] })
    } finally {
      setSubmitting(false)
    }
  }

  const err = (key: string) =>
    errors[key]?.[0] ? <p className="font-sans text-xs text-gold mt-1">{errors[key][0]}</p> : null

  return (
    <form onSubmit={submit} className="space-y-12">
      {success && (
        <div className="border border-gold bg-gold/5 p-4">
          <p className="font-sans text-xs text-gold">Profile updated successfully.</p>
        </div>
      )}
      {errors._form && (
        <p className="font-sans text-xs text-red-400">{errors._form[0]}</p>
      )}

      {/* Locked identity */}
      <section>
        <p className={SECTION}>Identity (admin-edit only)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-carbon p-5">
          <div>
            <p className={LABEL}>Name</p>
            <p className="font-sans text-sm text-ivory">{data.locked.firstName} {data.locked.lastName}</p>
          </div>
          <div>
            <p className={LABEL}>Date of Birth</p>
            <p className="font-sans text-sm text-ivory">{data.locked.dateOfBirth ?? '—'}</p>
          </div>
          <div>
            <p className={LABEL}>Nationality</p>
            <p className="font-sans text-sm text-ivory">{data.locked.nationality ?? '—'}</p>
          </div>
          <div>
            <p className={LABEL}>PEP Status</p>
            <p className="font-sans text-sm text-ivory">{data.locked.isPep ? 'Politically Exposed Person' : 'Not a PEP'}</p>
          </div>
        </div>
        <p className="font-sans text-[0.6rem] text-stone mt-2">
          To update these AML-critical fields, message us via the Messages tab.
        </p>
      </section>

      {/* Contact */}
      <section>
        <p className={SECTION}>Contact</p>
        <div className="space-y-5">
          <div>
            <label className={LABEL}>Phone</label>
            <input type="tel" required value={data.phone} onChange={(e) => update('phone', e.target.value)} className={FIELD} />
            {err('phone')}
          </div>
          <div>
            <label className={LABEL}>Look up address by postcode (optional)</label>
            <PostcodeLookup onPick={(a) => {
              update('addressLine1', [a.line1, a.line2].filter(Boolean).join(', '))
              update('city', a.town)
              update('postcode', a.postcode)
            }} />
          </div>
          <div>
            <label className={LABEL}>Address</label>
            <input type="text" required value={data.addressLine1} onChange={(e) => update('addressLine1', e.target.value)} className={FIELD} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={LABEL}>City</label>
              <input type="text" required value={data.city} onChange={(e) => update('city', e.target.value)} className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Postcode</label>
              <input type="text" required value={data.postcode} onChange={(e) => update('postcode', e.target.value)} className={FIELD} />
            </div>
          </div>
        </div>
      </section>

      {/* Investment criteria */}
      <section>
        <p className={SECTION}>Investment Criteria</p>
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={LABEL}>Minimum Budget (£)</label>
              <input type="number" value={data.budgetMin || ''} onChange={(e) => update('budgetMin', Number(e.target.value))} className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Maximum Budget (£)</label>
              <input type="number" value={data.budgetMax || ''} onChange={(e) => update('budgetMax', Number(e.target.value))} className={FIELD} />
              {err('budgetMax')}
            </div>
          </div>
          <div>
            <label className={LABEL}>Strategies</label>
            <div className="space-y-2">
              {STRATEGIES.map((s) => (
                <label key={s.code} className="flex items-start gap-3 cursor-pointer group p-3 border border-carbon hover:border-gold/40 transition-colors">
                  <input type="checkbox" checked={data.strategies.includes(s.code)} onChange={() => toggleStrategy(s.code)} className="mt-1 accent-gold" />
                  <div>
                    <p className="font-sans text-sm text-ivory">{s.label}</p>
                    <p className="font-sans text-[0.65rem] text-stone mt-0.5">{s.description}</p>
                  </div>
                </label>
              ))}
            </div>
            {err('strategies')}
          </div>
          <div>
            <label className={LABEL}>Buyer Type</label>
            <select value={data.buyerType} onChange={(e) => update('buyerType', e.target.value)} className={FIELD}>
              <option value="cash">Cash Buyer</option>
              <option value="mortgage">Mortgage Buyer</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Target Areas</label>
            <TargetAreaPicker value={data.targetAreaCodes} onChange={(codes) => update('targetAreaCodes', codes)} />
            {err('targetAreaCodes')}
          </div>
        </div>
      </section>

      {/* Experience & funding */}
      <section>
        <p className={SECTION}>Experience & Funding</p>
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={LABEL}>Experience</label>
              <select value={data.experienceLevel} onChange={(e) => update('experienceLevel', e.target.value)} className={FIELD}>
                <option value="" disabled>Select…</option>
                {EXPERIENCE_LEVELS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
              {err('experienceLevel')}
            </div>
            <div>
              <label className={LABEL}>Timeline</label>
              <select value={data.timelineToBuy} onChange={(e) => update('timelineToBuy', e.target.value)} className={FIELD}>
                <option value="" disabled>Select…</option>
                {TIMELINE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {err('timelineToBuy')}
            </div>
          </div>
          <div>
            <label className={LABEL}>How did you hear about us?</label>
            <input type="text" value={data.referralSource} onChange={(e) => update('referralSource', e.target.value)} className={FIELD} />
          </div>
          {data.buyerType === 'mortgage' && (
            <div className="border border-carbon p-5 space-y-4">
              <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">Mortgage Details</p>
              <div>
                <label className={LABEL}>Mortgage Status</label>
                <select value={data.mortgageStatus} onChange={(e) => update('mortgageStatus', e.target.value)} className={FIELD}>
                  <option value="" disabled>Select…</option>
                  {MORTGAGE_STATUS_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                {err('mortgageStatus')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className={LABEL}>Lender</label>
                  <input type="text" value={data.mortgageLender} onChange={(e) => update('mortgageLender', e.target.value)} className={FIELD} />
                </div>
                <div>
                  <label className={LABEL}>Max LTV %</label>
                  <input type="number" min={0} max={100} value={data.maxLtv ?? ''} onChange={(e) => update('maxLtv', e.target.value === '' ? undefined : Number(e.target.value))} className={FIELD} />
                </div>
                <div>
                  <label className={LABEL}>Deposit Available £</label>
                  <input type="number" min={0} value={data.depositAvailable ?? ''} onChange={(e) => update('depositAvailable', e.target.value === '' ? undefined : Number(e.target.value))} className={FIELD} />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Compliance (editable subset) */}
      <section>
        <p className={SECTION}>Tax & Source of Funds</p>
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={LABEL}>Country of Tax Residency</label>
              <select value={data.taxResidency} onChange={(e) => update('taxResidency', e.target.value)} className={FIELD}>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            {data.taxResidency === 'GB' && (
              <div>
                <label className={LABEL}>NI Number</label>
                <input type="text" value={data.niNumber} onChange={(e) => update('niNumber', e.target.value.toUpperCase())} className={FIELD} placeholder="QQ123456C" />
                {err('niNumber')}
              </div>
            )}
          </div>
          <div>
            <label className={LABEL}>Source of Funds</label>
            <select value={data.sourceOfFunds} onChange={(e) => update('sourceOfFunds', e.target.value)} className={FIELD}>
              <option value="" disabled>Select…</option>
              {SOURCE_OF_FUNDS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {err('sourceOfFunds')}
          </div>
          {data.sourceOfFunds === 'OTHER' && (
            <div>
              <label className={LABEL}>Please describe</label>
              <textarea rows={2} value={data.sourceOfFundsDetail} onChange={(e) => update('sourceOfFundsDetail', e.target.value)} className={FIELD} />
              {err('sourceOfFundsDetail')}
            </div>
          )}
        </div>
      </section>

      {/* Marketing */}
      <section>
        <p className={SECTION}>Communication Preferences</p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={data.marketingConsent} onChange={(e) => update('marketingConsent', e.target.checked)} className="mt-1 accent-gold" />
          <span className="font-sans text-sm text-stone">
            I&apos;d like to receive deal alerts and market updates. You can unsubscribe at any time.
          </span>
        </label>
      </section>

      <div className="border-t border-carbon pt-6">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
