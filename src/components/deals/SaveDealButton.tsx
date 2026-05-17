'use client'

import { useState, useEffect } from 'react'

interface Props {
  contentfulEntryId: string
  title: string
  slug: string
}

/** "Save deal" button on public Contentful deal pages. Shows different states
 *  depending on whether the visitor is signed in. */
export function SaveDealButton({ contentfulEntryId, title, slug }: Props) {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  // Probe auth state + current saved list once on mount
  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/session').then((r) => r.json()).then(async (s) => {
      if (cancelled) return
      const isAuthed = Boolean(s?.user)
      setAuthed(isAuthed)
      if (isAuthed) {
        try {
          const r = await fetch('/api/portal/contentful-interest')
          const j = await r.json()
          if (!cancelled && Array.isArray(j.entries)) {
            setSaved(j.entries.some((e: { contentfulEntryId: string }) => e.contentfulEntryId === contentfulEntryId))
          }
        } catch { /* ignore */ }
      }
    }).catch(() => setAuthed(false))
    return () => { cancelled = true }
  }, [contentfulEntryId])

  async function toggle() {
    if (!authed) {
      const next = encodeURIComponent(`/deals/${slug || ''}`)
      window.location.href = `/login?callbackUrl=${next}`
      return
    }
    setBusy(true)
    const want = !saved
    try {
      const res = want
        ? await fetch('/api/portal/contentful-interest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contentfulEntryId, title, slug }),
          })
        : await fetch(`/api/portal/contentful-interest?entryId=${encodeURIComponent(contentfulEntryId)}`, {
            method: 'DELETE',
          })
      if (res.ok) setSaved(want)
    } finally {
      setBusy(false)
    }
  }

  if (authed === null) return null // brief loading state

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-widest border transition-colors ${
        saved
          ? 'border-gold text-gold bg-gold/10 hover:bg-gold/20'
          : 'border-carbon text-stone hover:border-gold hover:text-gold'
      } disabled:opacity-60`}
      title={!authed ? 'Sign in to save deals' : saved ? 'Saved — click to remove' : 'Save to my portal'}
    >
      <span className="text-base leading-none">{saved ? '★' : '☆'}</span>
      {saved ? 'Saved' : authed ? 'Save to my portal' : 'Sign in to save'}
    </button>
  )
}
