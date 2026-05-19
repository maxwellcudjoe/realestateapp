'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  applicationId: string
}

export function InvestorTabStrip({ applicationId }: Props) {
  const pathname = usePathname()
  const base = `/admin/investors/${applicationId}`
  const tabs = [
    { href: base, label: 'Overview', match: (p: string) => p === base },
    { href: `${base}/deals`, label: 'Deals', match: (p: string) => p.startsWith(`${base}/deals`) },
    { href: `${base}/invoices`, label: 'Invoices', match: (p: string) => p.startsWith(`${base}/invoices`) },
    { href: `${base}/activity`, label: 'Activity', match: (p: string) => p.startsWith(`${base}/activity`) },
  ]

  return (
    <nav className="flex gap-6 border-b border-carbon mt-4">
      {tabs.map(({ href, label, match }) => {
        const active = match(pathname)
        return (
          <Link
            key={href}
            href={href}
            className={`relative font-sans text-[0.65rem] uppercase tracking-widest transition-colors pb-3
              ${active ? 'text-gold' : 'text-stone hover:text-ivory'}
              after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gold
              ${active ? 'after:opacity-100' : 'after:opacity-0 hover:after:opacity-100'}
              after:transition-opacity after:duration-150
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold
            `}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
