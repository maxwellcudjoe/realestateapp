'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import {
  COUNTRIES, SOURCE_OF_FUNDS_OPTIONS, ENTITY_TYPES,
  EXPERIENCE_LEVELS, TIMELINE_OPTIONS, MORTGAGE_STATUS_OPTIONS,
} from '@/lib/compliance'
import { AML_CORE_FIELDS } from '@/lib/schemas/admin-profile'

export interface EditableProfile {
  firstName: string
  lastName: string
  phone: string
  addressLine1: string
  city: string
  postcode: string
  entityType: string
  companyName: string | null
  companyNumber: string | null
  vatNumber: string | null
  companyAddress: string | null
  budgetMin: number
  budgetMax: number
  buyerType: string
  dateOfBirth: string | null
  nationality: string | null
  taxResidency: string | null
  niNumber: string | null
  isPep: boolean
  pepDetails: string | null
  sourceOfFunds: string | null
  sourceOfFundsDetail: string | null
  experienceLevel: string | null
  timelineToBuy: string | null
  mortgageStatus: string | null
  mortgageLender: string | null
  maxLtv: number | null
  depositAvailable: number | null
  referralSource: string | null
}

interface Props {
  applicationId: string
  initial: EditableProfile
}

const FIELD =
  'w-full bg-charcoal border border-carbon px-3 py-2 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1'

function asISODate(d: string | null): string {
  if (!d) return ''
  // Accepts both YYYY-MM-DD and ISO datetimes
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toISOString().slice(0, 10)
}

export function InvestorProfileEditor({ applicationId, initial }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [issues, setIssues] = useState<string[]>([])

  const [form, setForm] = useState<EditableProfile>({
    ...initial,
    dateOfBirth: asISODate(initial.dateOfBirth),
  })
  const [reason, setReason] = useState('')

  const dirtyFields = useMemo(() => {
    const out: (keyof EditableProfile)[] = []
    const norm = (v: unknown) => (v === '' ? null : v)
    for (const key of Object.keys(form) as (keyof EditableProfile)[]) {
      const initialNorm = key === 'dateOfBirth' ? asISODate(initial.dateOfBirth) : initial[key]
      if (norm(form[key]) !== norm(initialNorm)) out.push(key)
    }
    return out
  }, [form, initial])

  const amlDirty = dirtyFields.filter((k) => AML_CORE_FIELDS.has(k as string))

  function set<K extends keyof EditableProfile>(key: K, value: EditableProfile[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIssues([])
    if (dirtyFields.length === 0) {
      setError('No changes to save')
      return
    }
    if (amlDirty.length > 0 && reason.trim().length < 3) {
      setError('Reason required (3+ chars) when editing AML fields')
      return
    }
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {}
      for (const key of dirtyFields) {
        let value: unknown = form[key]
        if (key === 'dateOfBirth') {
          value = value && typeof value === 'string' && value.length > 0
            ? new Date(value).toISOString()
            : ''
        }
        if (value === '') value = null
        body[key] = value
      }
      if (amlDirty.length > 0) body.reason = reason.trim()

      const res = await fetch(`/api/admin/applications/${applicationId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Failed')
        if (Array.isArray(json.issues)) {
          setIssues(json.issues.map((i: { path: string[]; message: string }) =>
            `${i.path.join('.')} — ${i.message}`,
          ))
        }
        return
      }
      setOpen(false)
      setReason('')
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <div className="mt-8">
        <button
          onClick={() => setOpen(true)}
          className="px-5 py-2 border border-gold text-gold font-sans text-[0.6rem] uppercase tracking-widest hover:bg-gold hover:text-obsidian transition-colors"
        >
          ✎ Edit profile
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={save} className="mt-8 border border-gold/30 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">Edit Profile</h2>
        <button
          type="button"
          onClick={() => { setOpen(false); setForm({ ...initial, dateOfBirth: asISODate(initial.dateOfBirth) }); setReason(''); setError(''); setIssues([]) }}
          className="font-sans text-[0.6rem] uppercase tracking-widest text-stone hover:text-ivory transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Identity */}
      <section>
        <h3 className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-3">Identity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={LABEL}>First name</label><input className={FIELD} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} /></div>
          <div><label className={LABEL}>Last name</label><input className={FIELD} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></div>
          <div><label className={LABEL}>Phone</label><input className={FIELD} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+44…" /></div>
          <div><label className={LABEL}>Address line 1</label><input className={FIELD} value={form.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} /></div>
          <div><label className={LABEL}>City</label><input className={FIELD} value={form.city} onChange={(e) => set('city', e.target.value)} /></div>
          <div><label className={LABEL}>Postcode</label><input className={FIELD} value={form.postcode} onChange={(e) => set('postcode', e.target.value)} /></div>
        </div>
      </section>

      {/* Entity */}
      <section>
        <h3 className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-3">Buying entity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Entity type</label>
            <select className={FIELD} value={form.entityType} onChange={(e) => set('entityType', e.target.value)}>
              {ENTITY_TYPES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          {form.entityType !== 'INDIVIDUAL' && (
            <>
              <div><label className={LABEL}>Company name</label><input className={FIELD} value={form.companyName ?? ''} onChange={(e) => set('companyName', e.target.value)} /></div>
              <div><label className={LABEL}>Companies House #</label><input className={FIELD} value={form.companyNumber ?? ''} onChange={(e) => set('companyNumber', e.target.value)} /></div>
              <div><label className={LABEL}>VAT number</label><input className={FIELD} value={form.vatNumber ?? ''} onChange={(e) => set('vatNumber', e.target.value)} /></div>
              <div className="sm:col-span-2"><label className={LABEL}>Registered company address</label><input className={FIELD} value={form.companyAddress ?? ''} onChange={(e) => set('companyAddress', e.target.value)} /></div>
            </>
          )}
        </div>
      </section>

      {/* Investment */}
      <section>
        <h3 className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-3">Investment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className={LABEL}>Budget min (£)</label><input type="number" className={FIELD} value={form.budgetMin} onChange={(e) => set('budgetMin', Number(e.target.value))} /></div>
          <div><label className={LABEL}>Budget max (£)</label><input type="number" className={FIELD} value={form.budgetMax} onChange={(e) => set('budgetMax', Number(e.target.value))} /></div>
          <div>
            <label className={LABEL}>Buyer type</label>
            <select className={FIELD} value={form.buyerType} onChange={(e) => set('buyerType', e.target.value)}>
              <option value="cash">Cash</option>
              <option value="mortgage">Mortgage</option>
            </select>
          </div>
        </div>
      </section>

      {/* AML */}
      <section className="border border-red-500/20 bg-red-500/5 p-4">
        <h3 className="font-sans text-[0.55rem] uppercase tracking-widest text-red-400 mb-1">AML — requires reason</h3>
        <p className="font-sans text-xs text-stone mb-3">Edits here are logged with diff + reason in the audit trail.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={LABEL}>Date of birth</label><input type="date" className={FIELD} value={form.dateOfBirth ?? ''} onChange={(e) => set('dateOfBirth', e.target.value)} /></div>
          <div>
            <label className={LABEL}>Nationality</label>
            <select className={FIELD} value={form.nationality ?? ''} onChange={(e) => set('nationality', e.target.value || null)}>
              <option value="">—</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Tax residency</label>
            <select className={FIELD} value={form.taxResidency ?? ''} onChange={(e) => set('taxResidency', e.target.value || null)}>
              <option value="">—</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div><label className={LABEL}>NI number</label><input className={FIELD} value={form.niNumber ?? ''} onChange={(e) => set('niNumber', e.target.value)} placeholder="QQ123456C" /></div>
          <div className="sm:col-span-2 flex items-center gap-3 pt-2">
            <label className="font-sans text-sm text-ivory flex items-center gap-2">
              <input type="checkbox" checked={form.isPep} onChange={(e) => set('isPep', e.target.checked)} className="accent-gold" />
              Politically Exposed Person
            </label>
          </div>
          {form.isPep && (
            <div className="sm:col-span-2">
              <label className={LABEL}>PEP details</label>
              <textarea rows={2} className={`${FIELD} resize-none`} value={form.pepDetails ?? ''} onChange={(e) => set('pepDetails', e.target.value)} />
            </div>
          )}
          <div>
            <label className={LABEL}>Source of funds</label>
            <select className={FIELD} value={form.sourceOfFunds ?? ''} onChange={(e) => set('sourceOfFunds', e.target.value || null)}>
              <option value="">—</option>
              {SOURCE_OF_FUNDS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Source of funds — detail</label>
            <input className={FIELD} value={form.sourceOfFundsDetail ?? ''} onChange={(e) => set('sourceOfFundsDetail', e.target.value)} />
          </div>
        </div>
      </section>

      {/* Experience & funding */}
      <section>
        <h3 className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-3">Experience & funding</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Experience</label>
            <select className={FIELD} value={form.experienceLevel ?? ''} onChange={(e) => set('experienceLevel', e.target.value || null)}>
              <option value="">—</option>
              {EXPERIENCE_LEVELS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Timeline</label>
            <select className={FIELD} value={form.timelineToBuy ?? ''} onChange={(e) => set('timelineToBuy', e.target.value || null)}>
              <option value="">—</option>
              {TIMELINE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Mortgage status</label>
            <select className={FIELD} value={form.mortgageStatus ?? ''} onChange={(e) => set('mortgageStatus', e.target.value || null)}>
              <option value="">—</option>
              {MORTGAGE_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div><label className={LABEL}>Lender</label><input className={FIELD} value={form.mortgageLender ?? ''} onChange={(e) => set('mortgageLender', e.target.value)} /></div>
          <div><label className={LABEL}>Max LTV (%)</label><input type="number" className={FIELD} value={form.maxLtv ?? ''} onChange={(e) => set('maxLtv', e.target.value ? Number(e.target.value) : null)} /></div>
          <div><label className={LABEL}>Deposit available (£)</label><input type="number" className={FIELD} value={form.depositAvailable ?? ''} onChange={(e) => set('depositAvailable', e.target.value ? Number(e.target.value) : null)} /></div>
          <div className="sm:col-span-2"><label className={LABEL}>Referral source</label><input className={FIELD} value={form.referralSource ?? ''} onChange={(e) => set('referralSource', e.target.value)} /></div>
        </div>
      </section>

      {amlDirty.length > 0 && (
        <section className="border border-red-500/30 p-4">
          <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-red-400 mb-2">
            Reason for AML edits <span>*</span>
          </label>
          <p className="font-sans text-xs text-stone mb-2">
            Editing: {amlDirty.map((f) => String(f)).join(', ')}
          </p>
          <textarea rows={2} className={`${FIELD} resize-none`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Investor reported typo in NI number on 2026-05-18 call" />
        </section>
      )}

      {error && <p className="font-sans text-xs text-red-400">{error}</p>}
      {issues.length > 0 && (
        <ul className="font-sans text-xs text-red-400 list-disc list-inside">
          {issues.map((i, idx) => <li key={idx}>{i}</li>)}
        </ul>
      )}

      <div className="flex items-center gap-4 pt-4 border-t border-carbon">
        <Button type="submit" disabled={submitting || dirtyFields.length === 0}>
          {submitting ? 'Saving…' : `Save ${dirtyFields.length} change${dirtyFields.length === 1 ? '' : 's'}`}
        </Button>
        <span className="font-sans text-[0.6rem] uppercase tracking-widest text-stone">
          {dirtyFields.length === 0 ? 'No changes' : `${dirtyFields.length} field${dirtyFields.length === 1 ? '' : 's'} dirty`}
        </span>
      </div>
    </form>
  )
}
