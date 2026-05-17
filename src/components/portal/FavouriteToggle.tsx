'use client'

import { useState, useTransition } from 'react'

interface Props {
  dealId: string
  initiallyFavourited: boolean
}

export function FavouriteToggle({ dealId, initiallyFavourited }: Props) {
  const [favourited, setFavourited] = useState(initiallyFavourited)
  const [busy, startTransition] = useTransition()

  async function toggle() {
    const next = !favourited
    setFavourited(next)   // optimistic
    startTransition(async () => {
      try {
        const res = await fetch(`/api/portal/deals/${dealId}/favourite`, {
          method: next ? 'POST' : 'DELETE',
        })
        if (!res.ok) setFavourited(!next)  // revert
      } catch {
        setFavourited(!next)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={favourited}
      aria-label={favourited ? 'Remove from favourites' : 'Add to favourites'}
      className={`text-xl leading-none transition-colors disabled:opacity-60 ${favourited ? 'text-gold hover:text-ivory' : 'text-stone hover:text-gold'}`}
      title={favourited ? 'Favourited — click to remove' : 'Mark as favourite'}
    >
      {favourited ? '★' : '☆'}
    </button>
  )
}
