'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Lead {
  id?: string
  name?: string
  email?: string | null
  phone?: string | null
  sourceChannel?: string
  sourceReferrer?: string | null
  sourceNote?: string | null
  strategyCodes?: string[]
  targetAreaCodes?: string[]
  budgetMin?: number | null
  budgetMax?: number | null
  experienceLevel?: string | null
  timeline?: string | null
  fundingStatus?: string | null
  status?: string
}

const CHANNELS = ['PHONE_CALL','PARTNER_INTRO','AGENT_REFERRAL','WALK_IN','EVENT','WEB_ENQUIRY','OTHER']
const STATUSES = ['NEW','CONTACTED','QUALIFIED','CONVERTED','DECLINED','DORMANT']
const STRATEGIES = ['BTL','HMO','FLIP','COMMERCIAL','SERVICED_ACCOM']
const TIMELINES = ['IMMEDIATE','3_MONTHS','6_MONTHS','12_MONTHS','EXPLORATORY']
const EXPERIENCES = ['NONE','FIRST_TIME','1_2_DEALS','3_PLUS']
const FUNDINGS = ['CASH','MORTGAGE_AGREED','MORTGAGE_LIKELY','UNCLEAR']

export function LeadForm({ initial, mode }: { initial?: Lead; mode: 'create' | 'edit' }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [lead, setLead] = useState<Lead>(initial ?? { sourceChannel: 'PHONE_CALL', strategyCodes: [], targetAreaCodes: [], status: 'NEW' })

  function set<K extends keyof Lead>(k: K, v: Lead[K]) { setLead((p) => ({ ...p, [k]: v })) }

  function toggleArray(arr: string[] = [], code: string): string[] {
    return arr.includes(code) ? arr.filter((x) => x !== code) : [...arr, code]
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const url = mode === 'create' ? '/api/admin/leads' : `/api/admin/leads/${initial!.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method, headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: lead.name, email: lead.email || null, phone: lead.phone || null,
          sourceChannel: lead.sourceChannel, sourceReferrer: lead.sourceReferrer || null, sourceNote: lead.sourceNote || null,
          strategyCodes: lead.strategyCodes ?? [], targetAreaCodes: lead.targetAreaCodes ?? [],
          budgetMin: lead.budgetMin ?? null, budgetMax: lead.budgetMax ?? null,
          experienceLevel: lead.experienceLevel || null, timeline: lead.timeline || null, fundingStatus: lead.fundingStatus || null,
          ...(mode === 'edit' ? { status: lead.status } : {}),
        }),
      })
      if (res.ok) {
        const json = await res.json()
        router.push(`/admin/leads/${(json.lead?.id ?? initial?.id)}`)
        router.refresh()
      } else {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? 'Save failed')
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-2xl">
      <label className="block text-sm"><span>Name *</span>
        <input required value={lead.name ?? ''} onChange={(e) => set('name', e.target.value)} className="mt-1 w-full border border-stone-300 rounded px-3 py-2" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm"><span>Email</span>
          <input type="email" value={lead.email ?? ''} onChange={(e) => set('email', e.target.value)} className="mt-1 w-full border border-stone-300 rounded px-3 py-2" />
        </label>
        <label className="block text-sm"><span>Phone</span>
          <input value={lead.phone ?? ''} onChange={(e) => set('phone', e.target.value)} className="mt-1 w-full border border-stone-300 rounded px-3 py-2" placeholder="+447700900000" />
        </label>
      </div>
      <fieldset className="border border-stone-200 rounded p-3 space-y-2">
        <legend className="text-sm font-medium px-2">Source</legend>
        <label className="block text-sm"><span>Channel *</span>
          <select required value={lead.sourceChannel ?? ''} onChange={(e) => set('sourceChannel', e.target.value)} className="mt-1 w-full border border-stone-300 rounded px-3 py-2">
            {CHANNELS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
        </label>
        <label className="block text-sm"><span>Referrer (who told us?)</span>
          <input value={lead.sourceReferrer ?? ''} onChange={(e) => set('sourceReferrer', e.target.value)} className="mt-1 w-full border border-stone-300 rounded px-3 py-2" />
        </label>
        <label className="block text-sm"><span>Context</span>
          <textarea value={lead.sourceNote ?? ''} onChange={(e) => set('sourceNote', e.target.value)} rows={2} className="mt-1 w-full border border-stone-300 rounded px-3 py-2" />
        </label>
      </fieldset>
      <fieldset className="border border-stone-200 rounded p-3 space-y-2">
        <legend className="text-sm font-medium px-2">Intent</legend>
        <div className="text-sm">
          <span>Strategies</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {STRATEGIES.map((s) => (
              <label key={s} className="inline-flex items-center gap-1 text-xs border border-stone-300 rounded px-2 py-1 cursor-pointer">
                <input type="checkbox" checked={(lead.strategyCodes ?? []).includes(s)} onChange={() => set('strategyCodes', toggleArray(lead.strategyCodes, s))} />
                {s}
              </label>
            ))}
          </div>
        </div>
        <label className="block text-sm"><span>Target area codes (comma-separated)</span>
          <input value={(lead.targetAreaCodes ?? []).join(', ')} onChange={(e) => set('targetAreaCodes', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} className="mt-1 w-full border border-stone-300 rounded px-3 py-2" placeholder="LE1, LE2, LE3" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm"><span>Budget min (£)</span>
            <input type="number" min={0} value={lead.budgetMin ?? ''} onChange={(e) => set('budgetMin', e.target.value === '' ? null : Number(e.target.value))} className="mt-1 w-full border border-stone-300 rounded px-3 py-2" />
          </label>
          <label className="block text-sm"><span>Budget max (£)</span>
            <input type="number" min={0} value={lead.budgetMax ?? ''} onChange={(e) => set('budgetMax', e.target.value === '' ? null : Number(e.target.value))} className="mt-1 w-full border border-stone-300 rounded px-3 py-2" />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="block text-sm"><span>Experience</span>
            <select value={lead.experienceLevel ?? ''} onChange={(e) => set('experienceLevel', e.target.value || null)} className="mt-1 w-full border border-stone-300 rounded px-3 py-2">
              <option value="">—</option>{EXPERIENCES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label className="block text-sm"><span>Timeline</span>
            <select value={lead.timeline ?? ''} onChange={(e) => set('timeline', e.target.value || null)} className="mt-1 w-full border border-stone-300 rounded px-3 py-2">
              <option value="">—</option>{TIMELINES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          <label className="block text-sm"><span>Funding</span>
            <select value={lead.fundingStatus ?? ''} onChange={(e) => set('fundingStatus', e.target.value || null)} className="mt-1 w-full border border-stone-300 rounded px-3 py-2">
              <option value="">—</option>{FUNDINGS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
        </div>
      </fieldset>
      {mode === 'edit' && (
        <label className="block text-sm"><span>Status</span>
          <select value={lead.status ?? 'NEW'} onChange={(e) => set('status', e.target.value)} className="mt-1 w-full border border-stone-300 rounded px-3 py-2">
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      )}
      {error && <p className="text-rose-700 text-sm">{error}</p>}
      <button type="submit" disabled={pending} className="bg-stone-900 text-white px-4 py-2 rounded disabled:opacity-50">
        {pending ? 'Saving…' : mode === 'create' ? 'Create lead' : 'Save changes'}
      </button>
    </form>
  )
}
