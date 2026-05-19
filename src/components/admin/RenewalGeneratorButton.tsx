'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

const FIELD = 'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

interface RunEntry {
  userId: string
  userEmail: string
  investorName: string
  invoiceNumber: string
  amount: number
  dueAt: string
}

interface SkippedEntry {
  userId: string
  userEmail: string
  investorName: string
  reason: string
}

interface RunResult {
  dryRun: boolean
  created: RunEntry[]
  skipped: SkippedEntry[]
  total: number
}

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export function RenewalGeneratorButton() {
  const router = useRouter()
  const [horizon, setHorizon] = useState(7)
  const [previewing, setPreviewing] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [preview, setPreview] = useState<RunResult | null>(null)
  const [committed, setCommitted] = useState<RunResult | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')

  // When a new preview lands, default to all subscribers selected.
  useEffect(() => {
    if (preview) setSelected(new Set(preview.created.map((e) => e.userId)))
  }, [preview])

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  function toggleAll() {
    if (!preview) return
    if (selected.size === preview.created.length) setSelected(new Set())
    else setSelected(new Set(preview.created.map((e) => e.userId)))
  }

  async function runDryRun() {
    setError(''); setPreviewing(true); setCommitted(null)
    try {
      const res = await fetch(`/api/admin/subscriptions/generate-renewals?days=${horizon}&dryRun=true`, { method: 'POST' })
      const json: RunResult = await res.json()
      if (!res.ok) setError((json as unknown as { error?: string }).error ?? 'Failed')
      else setPreview(json)
    } catch {
      setError('Network error')
    } finally {
      setPreviewing(false)
    }
  }

  async function commit() {
    if (selected.size === 0) return
    setError(''); setCommitting(true)
    try {
      const userIds = Array.from(selected).join(',')
      const res = await fetch(`/api/admin/subscriptions/generate-renewals?days=${horizon}&userIds=${encodeURIComponent(userIds)}`, { method: 'POST' })
      const json: RunResult = await res.json()
      if (!res.ok) setError((json as unknown as { error?: string }).error ?? 'Failed')
      else {
        setCommitted(json)
        setPreview(null)
        setSelected(new Set())
        router.refresh()
      }
    } catch {
      setError('Network error')
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div className="border border-carbon p-5 space-y-4">
      <div>
        <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-2">Generate subscription renewals</p>
        <p className="font-sans text-xs text-stone">
          Issues SUBSCRIPTION invoices for active subscribers whose renewal falls within the horizon.
          Skips anyone billed in the last 25 days. Always preview first.
        </p>
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1 max-w-[150px]">
          <label className={LABEL}>Horizon (days)</label>
          <input
            type="number"
            min={1}
            max={60}
            value={horizon}
            onChange={(e) => setHorizon(Math.max(1, Math.min(60, Number(e.target.value) || 7)))}
            className={FIELD}
          />
        </div>
        <Button type="button" onClick={runDryRun} disabled={previewing || committing}>
          {previewing ? 'Previewing…' : 'Preview'}
        </Button>
      </div>

      {error && <p className="font-sans text-xs text-red-400">{error}</p>}

      {preview && (
        <div className="border-t border-carbon pt-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">
                Preview: {preview.created.length} eligible · {preview.skipped.length} skipped
              </p>
              {preview.created.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="font-sans text-[0.6rem] uppercase tracking-widest text-stone hover:text-ivory transition-colors mt-1"
                >
                  {selected.size === preview.created.length ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>
            {preview.created.length > 0 && (
              <Button type="button" onClick={commit} disabled={committing || selected.size === 0}>
                {committing
                  ? 'Sending…'
                  : selected.size === 0
                    ? 'Select at least one'
                    : `Send ${selected.size} invoice${selected.size === 1 ? '' : 's'}`}
              </Button>
            )}
          </div>
          {preview.created.length > 0 && (
            <ul className="space-y-1.5">
              {preview.created.map((e) => {
                const checked = selected.has(e.userId)
                return (
                  <li
                    key={e.userId}
                    className={`font-sans text-xs flex items-start gap-3 border-l-2 pl-3 py-1 ${checked ? 'border-gold/40 text-ivory' : 'border-carbon text-stone/60'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(e.userId)}
                      className="mt-0.5 accent-gold cursor-pointer"
                      aria-label={`Bill ${e.investorName}`}
                    />
                    <div>
                      <strong>{e.investorName}</strong> · {fmt(e.amount)} · due {fmtDate(e.dueAt)}
                      <span className="text-stone"> · {e.userEmail}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {preview.skipped.length > 0 && (
            <details className="font-sans text-xs">
              <summary className="text-stone cursor-pointer">{preview.skipped.length} skipped — show</summary>
              <ul className="mt-2 space-y-1">
                {preview.skipped.map((e) => (
                  <li key={e.userId} className="text-stone/70 border-l-2 border-carbon pl-3">
                    {e.investorName} — {e.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {committed && (
        <div className="border-t border-carbon pt-4">
          <p className="font-sans text-[0.6rem] uppercase tracking-widest text-green-400">
            Done — {committed.created.length} invoice{committed.created.length === 1 ? '' : 's'} sent
          </p>
          <ul className="mt-2 space-y-1">
            {committed.created.map((e) => (
              <li key={e.userId} className="font-sans text-xs text-ivory">
                <span className="text-gold">{e.invoiceNumber}</span> · {e.investorName} · {fmt(e.amount)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
