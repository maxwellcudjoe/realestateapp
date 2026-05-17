'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TARGET_AREAS } from '@/lib/target-areas'
import { STRATEGIES, strategyLabel } from '@/lib/strategies'
import { Button } from '@/components/ui/Button'

const FIELD = 'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

interface Match {
  applicationId: string
  investorProfileId: string
  email: string
  firstName: string
  lastName: string
  budgetMin: number
  budgetMax: number
  buyerType: string
  entityType: string
  strategies: string[]
  areaCodes: string[]
}

const fmt = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`

export function MatchAndPost() {
  const router = useRouter()
  const [areaCode, setAreaCode] = useState('')
  const [strategyCode, setStrategyCode] = useState('')
  const [price, setPrice] = useState<number>(0)
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [summary, setSummary] = useState('')

  const [matches, setMatches] = useState<Match[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [searching, setSearching] = useState(false)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function findMatches() {
    if (!price) { setError('Enter a price first'); return }
    setError(''); setSuccess(''); setSearching(true); setMatches(null)
    try {
      const res = await fetch('/api/admin/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price,
          areaCode: areaCode || undefined,
          strategyCode: strategyCode || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Match failed')
      } else {
        setMatches(json.matches)
        setSelected(new Set(json.matches.map((m: Match) => m.applicationId)))
      }
    } catch {
      setError('Network error')
    } finally {
      setSearching(false)
    }
  }

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }

  async function batchPost() {
    if (!title || !address || !price || selected.size === 0) {
      setError('Need title, address, price, and at least one investor selected'); return
    }
    setError(''); setSuccess(''); setPosting(true)
    try {
      const res = await fetch('/api/admin/match/batch-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationIds: Array.from(selected),
          title, address, askingPrice: price, summary: summary || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Post failed')
      } else {
        setSuccess(`Posted to ${json.posted} investor${json.posted === 1 ? '' : 's'}.`)
        setMatches(null); setSelected(new Set())
        setTitle(''); setAddress(''); setSummary('')
        router.refresh()
      }
    } catch {
      setError('Network error')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">1. Match Criteria</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className={LABEL}>Asking price (£)</label>
            <input type="number" min={1} value={price || ''} onChange={(e) => setPrice(Number(e.target.value))} className={FIELD} placeholder="250000" />
          </div>
          <div>
            <label className={LABEL}>Area (optional)</label>
            <select value={areaCode} onChange={(e) => setAreaCode(e.target.value)} className={FIELD}>
              <option value="">Any area</option>
              {TARGET_AREAS.map((a) => <option key={a.code} value={a.code}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Strategy (optional)</label>
            <select value={strategyCode} onChange={(e) => setStrategyCode(e.target.value)} className={FIELD}>
              <option value="">Any strategy</option>
              {STRATEGIES.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <Button type="button" onClick={findMatches} disabled={searching || !price}>
            {searching ? 'Searching…' : 'Find Matched Investors'}
          </Button>
        </div>
        {error && <p className="font-sans text-xs text-red-400 mt-3">{error}</p>}
        {success && <p className="font-sans text-xs text-gold mt-3">{success}</p>}
      </section>

      {matches !== null && (
        <section>
          <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">
            2. Matched Investors ({matches.length})
          </h2>
          {matches.length === 0 ? (
            <p className="font-sans text-sm text-stone">
              No ACTIVE_INVESTOR matches for these criteria. Try widening filters or check that investors are activated.
            </p>
          ) : (
            <>
              <div className="flex gap-3 mb-4">
                <button onClick={() => setSelected(new Set(matches.map((m) => m.applicationId)))} className="font-sans text-[0.6rem] uppercase tracking-widest text-gold hover:text-ivory">Select all</button>
                <button onClick={() => setSelected(new Set())} className="font-sans text-[0.6rem] uppercase tracking-widest text-stone hover:text-ivory">Clear</button>
              </div>
              <ul className="divide-y divide-carbon/60 border border-carbon">
                {matches.map((m) => (
                  <li key={m.applicationId} className="p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={selected.has(m.applicationId)} onChange={() => toggle(m.applicationId)} className="mt-1 accent-gold" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-sans text-sm text-ivory">{m.firstName} {m.lastName}</p>
                          <span className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">{m.email}</span>
                        </div>
                        <p className="font-sans text-xs text-stone mt-1">
                          {fmt(m.budgetMin)}–{fmt(m.budgetMax)} · {m.buyerType} · {m.entityType !== 'INDIVIDUAL' && `${m.entityType} · `}
                          {m.strategies.map(strategyLabel).join(', ') || 'no strategies set'}
                        </p>
                        {m.areaCodes.length > 0 && (
                          <p className="font-sans text-[0.6rem] text-stone/70 mt-0.5">Areas: {m.areaCodes.slice(0, 5).join(', ')}{m.areaCodes.length > 5 && ` +${m.areaCodes.length - 5} more`}</p>
                        )}
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {matches && matches.length > 0 && (
        <section>
          <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">
            3. Deal Details ({selected.size} recipient{selected.size === 1 ? '' : 's'})
          </h2>
          <div className="space-y-5">
            <div>
              <label className={LABEL}>Title</label>
              <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className={FIELD} placeholder="3-bed terraced BMV in Salford" />
            </div>
            <div>
              <label className={LABEL}>Address</label>
              <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} className={FIELD} placeholder="123 Example Road, Salford M6 5XX" />
            </div>
            <div>
              <label className={LABEL}>Summary (optional)</label>
              <textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} className={FIELD} placeholder="Cash-in deal, vendor needs quick completion. Recent EPC C…" />
            </div>
            <Button type="button" onClick={batchPost} disabled={posting || selected.size === 0 || !title || !address}>
              {posting ? 'Posting…' : `Post Deal to ${selected.size} Investor${selected.size === 1 ? '' : 's'}`}
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
