'use client'

import { useState } from 'react'

interface Props {
  address: string
  viewingDate: string // ISO
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export function PostViewingPrompt({ address, viewingDate }: Props) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  function scrollToOffer() {
    const el = document.getElementById('offer-section')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="mb-12">
      <div className="border border-gold bg-gold/10 p-5 flex items-start justify-between gap-6">
        <div className="flex-1">
          <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-2">Post-viewing — next step</p>
          <p className="font-sans text-base text-ivory leading-relaxed">
            You viewed <strong>{address}</strong> on <strong>{fmtDate(viewingDate)}</strong>.
            Ready to make your formal offer?
          </p>
          <div className="flex items-center gap-5 mt-4">
            <button
              type="button"
              onClick={scrollToOffer}
              className="font-sans text-xs uppercase tracking-widest text-obsidian bg-gold px-5 py-2.5 hover:bg-gold/90 transition-colors"
            >
              Make offer ↓
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="font-sans text-xs uppercase tracking-widest text-stone hover:text-ivory transition-colors"
            >
              Not yet
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
