'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const STRATEGIES = ['All', 'BTL', 'HMO', 'Flip'] as const

export function FilterBar() {
  const searchParams = useSearchParams()
  const current = searchParams.get('strategy') ?? 'All'

  return (
    <div className="flex flex-wrap gap-0.5 py-4 px-8 border-b border-carbon">
      {STRATEGIES.map((s) => {
        const active = s === current || (s === 'All' && !searchParams.get('strategy'))
        return (
          <Link
            key={s}
            href={s === 'All' ? '/deals' : `/deals?strategy=${s}`}
            className={`px-5 py-2 border font-sans text-xs font-semibold uppercase tracking-widest transition-colors ${
              active
                ? 'border-gold text-gold'
                : 'border-carbon text-stone hover:border-stone hover:text-ivory'
            }`}
          >
            {s}
          </Link>
        )
      })}
    </div>
  )
}
