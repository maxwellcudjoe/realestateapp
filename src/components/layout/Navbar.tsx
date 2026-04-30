'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'

const NAV_LINKS = [
  { href: '/',        label: 'Home' },
  { href: '/about',   label: 'About' },
  { href: '/deals',   label: 'Deals' },
  { href: '/contact', label: 'Contact' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-obsidian border-b border-carbon'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-8 h-[72px] flex items-center justify-between">
        <Logo />

        <ul className="hidden md:flex items-center gap-10 list-none">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`relative font-sans text-[0.65rem] font-semibold uppercase tracking-widest transition-colors duration-150 pb-1
                    ${active ? 'text-ivory' : 'text-stone hover:text-ivory'}
                    after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gold
                    ${active ? 'after:opacity-100' : 'after:opacity-0 hover:after:opacity-100'}
                    after:transition-opacity after:duration-150
                  `}
                >
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>

        <Button href="/register" variant="primary" className="hidden md:inline-block text-[0.6rem] px-5 py-2.5">
          Register as Buyer
        </Button>
      </div>
    </nav>
  )
}
