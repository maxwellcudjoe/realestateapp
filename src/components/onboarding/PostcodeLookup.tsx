'use client'

import { useState } from 'react'

interface AddressResult {
  line1: string
  line2?: string
  town: string
  postcode: string
}

interface Props {
  onPick: (a: AddressResult) => void
}

const FIELD = 'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors'

export function PostcodeLookup({ onPick }: Props) {
  const [postcode, setPostcode] = useState('')
  const [results, setResults] = useState<AddressResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [unavailable, setUnavailable] = useState(false)

  async function search(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setUnavailable(false); setResults(null); setLoading(true)
    try {
      const res = await fetch(`/api/portal/postcode-lookup?postcode=${encodeURIComponent(postcode)}`)
      if (res.status === 503) {
        setUnavailable(true)
      } else if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? 'Lookup failed')
      } else {
        const json = await res.json()
        setResults(json.addresses ?? [])
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (unavailable) {
    return (
      <p className="font-sans text-[0.6rem] text-stone">
        Address lookup isn&apos;t enabled on this environment — type the address manually below.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <form onSubmit={search} className="flex gap-3">
        <input
          type="text"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value.toUpperCase())}
          placeholder="Enter postcode (e.g. E1 6AN)"
          className={FIELD}
          maxLength={8}
        />
        <button
          type="submit"
          disabled={loading || !postcode}
          className="px-5 py-3 border border-gold text-gold font-sans text-[0.6rem] uppercase tracking-widest hover:bg-gold hover:text-obsidian transition-colors whitespace-nowrap disabled:opacity-50"
        >
          {loading ? 'Looking up…' : 'Find address'}
        </button>
      </form>
      {error && <p className="font-sans text-xs text-red-400">{error}</p>}
      {results && results.length === 0 && (
        <p className="font-sans text-xs text-stone">No addresses found for that postcode.</p>
      )}
      {results && results.length > 0 && (
        <div className="max-h-48 overflow-y-auto border border-carbon">
          <ul className="divide-y divide-carbon/50">
            {results.map((a, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => { onPick(a); setResults(null) }}
                  className="w-full text-left p-3 hover:bg-carbon/30 transition-colors font-sans text-xs text-ivory"
                >
                  {[a.line1, a.line2, a.town, a.postcode].filter(Boolean).join(', ')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
