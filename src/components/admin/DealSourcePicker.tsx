'use client'

const CHANNELS = [
  { code: 'AGENT_EMAIL', label: 'Agent email' },
  { code: 'SOURCER', label: 'Sourcer' },
  { code: 'PARTNER_INTRO', label: 'Partner intro' },
  { code: 'LEAD_REQUEST', label: 'Lead request' },
  { code: 'DIRECT_VENDOR', label: 'Direct vendor' },
  { code: 'OTHER', label: 'Other' },
] as const

export interface DealSourceValue {
  sourceChannel: string
  sourceLeadId: string
  sourceContactId: string
  sourceNote: string
}

interface Props {
  value: DealSourceValue
  onChange: (next: DealSourceValue) => void
}

const FIELD = 'w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

export function DealSourcePicker({ value, onChange }: Props) {
  function set<K extends keyof DealSourceValue>(key: K, v: DealSourceValue[K]) {
    onChange({ ...value, [key]: v })
  }

  return (
    <fieldset className="border-t border-carbon pt-4 space-y-3">
      <legend className="font-sans text-[0.55rem] uppercase tracking-widest text-stone/70 px-1">
        Source attribution (optional)
      </legend>
      <div>
        <label className={LABEL}>Channel</label>
        <select
          value={value.sourceChannel}
          onChange={(e) => set('sourceChannel', e.target.value)}
          className={FIELD}
        >
          <option value="">—</option>
          {CHANNELS.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Lead ID</label>
          <input
            type="text"
            value={value.sourceLeadId}
            onChange={(e) => set('sourceLeadId', e.target.value)}
            placeholder="Paste from /admin/leads"
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL}>Dealer contact ID</label>
          <input
            type="text"
            value={value.sourceContactId}
            onChange={(e) => set('sourceContactId', e.target.value)}
            placeholder="From inbound email thread"
            className={FIELD}
          />
        </div>
      </div>
      <div>
        <label className={LABEL}>Source note</label>
        <textarea
          value={value.sourceNote}
          onChange={(e) => set('sourceNote', e.target.value)}
          rows={2}
          placeholder="Optional context — e.g. who introduced the deal"
          className={`${FIELD} resize-none`}
        />
      </div>
    </fieldset>
  )
}
