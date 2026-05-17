'use client'

import { useMemo, useState } from 'react'
import { areasByGroup, areaLabel, TARGET_AREAS } from '@/lib/target-areas'

interface Props {
  value: string[]
  onChange: (codes: string[]) => void
}

export function TargetAreaPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState('')
  const grouped = useMemo(() => areasByGroup(), [])
  const filtered = useMemo(() => {
    if (!query.trim()) return null
    const q = query.toLowerCase()
    return TARGET_AREAS.filter((a) => a.label.toLowerCase().includes(q))
  }, [query])

  const selected = new Set(value)

  function toggle(code: string) {
    const next = new Set(selected)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    onChange(Array.from(next))
  }

  function remove(code: string) {
    onChange(value.filter((c) => c !== code))
  }

  return (
    <div className="space-y-3">
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 px-3 py-1 text-xs text-ivory"
            >
              {areaLabel(code)}
              <button
                type="button"
                onClick={() => remove(code)}
                className="text-stone hover:text-gold transition-colors"
                aria-label={`Remove ${areaLabel(code)}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search areas (e.g. Manchester, EH, London)…"
        className="w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors"
      />

      {/* Picker */}
      <div className="max-h-72 overflow-y-auto border border-carbon">
        {filtered ? (
          filtered.length === 0 ? (
            <p className="font-sans text-xs text-stone p-4">No areas match &ldquo;{query}&rdquo;.</p>
          ) : (
            <ul className="divide-y divide-carbon/50">
              {filtered.map((a) => (
                <li key={a.code}>
                  <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-carbon/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={selected.has(a.code)}
                      onChange={() => toggle(a.code)}
                      className="accent-gold"
                    />
                    <span className="font-sans text-sm text-ivory">{a.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          )
        ) : (
          Object.entries(grouped).map(([group, options]) => (
            <div key={group}>
              <p className="font-sans text-[0.55rem] uppercase tracking-widest text-gold bg-charcoal px-3 py-2 sticky top-0">{group}</p>
              <ul className="divide-y divide-carbon/50">
                {options.map((a) => (
                  <li key={a.code}>
                    <label className="flex items-center gap-3 p-3 cursor-pointer hover:bg-carbon/30 transition-colors">
                      <input
                        type="checkbox"
                        checked={selected.has(a.code)}
                        onChange={() => toggle(a.code)}
                        className="accent-gold"
                      />
                      <span className="font-sans text-sm text-ivory">{a.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <p className="font-sans text-[0.6rem] text-stone">
        Pick the areas you want deal packs for. You can change this any time from your portal.
      </p>
    </div>
  )
}
