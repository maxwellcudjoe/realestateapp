'use client'

import { usePathname } from 'next/navigation'
import { SectionLabel } from '@/components/ui/SectionLabel'
import Link from 'next/link'

const ADMIN_LINKS = [
  { href: '/admin/investors', label: 'Investors' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-obsidian pt-[72px]">
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <SectionLabel>Operations Dashboard</SectionLabel>
          <nav className="flex gap-6">
            {ADMIN_LINKS.map(({ href, label }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative font-sans text-[0.6rem] uppercase tracking-widest transition-colors pb-1
                    ${active ? 'text-ivory' : 'text-stone hover:text-ivory'}
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
        </div>
        {children}
      </div>
    </div>
  )
}
