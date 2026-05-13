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
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  const isAuthPage = pathname.startsWith('/portal') || pathname.startsWith('/admin')

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || menuOpen
          ? 'bg-obsidian border-b border-carbon'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-8 h-[72px] flex items-center justify-between">
        <Logo />

        {/* Desktop nav */}
        {!isAuthPage && (
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
                      focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold
                    `}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        {/* Auth page nav — show back to site + portal context */}
        {isAuthPage && (
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="font-sans text-[0.6rem] font-medium uppercase tracking-widest text-stone hover:text-ivory transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
            >
              ← Back to Site
            </Link>
          </div>
        )}

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/login"
            className="font-sans text-[0.6rem] font-medium uppercase tracking-widest text-gold hover:text-ivory transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
          >
            Investor Login
          </Link>
          {!isAuthPage && (
            <Button href="/onboarding" variant="primary" className="text-[0.6rem] px-5 py-2.5">
              Register as Buyer
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden flex flex-col gap-1.5 p-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={`block w-5 h-px bg-ivory transition-transform duration-200 ${menuOpen ? 'rotate-45 translate-y-[4px]' : ''}`} />
          <span className={`block w-5 h-px bg-ivory transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-5 h-px bg-ivory transition-transform duration-200 ${menuOpen ? '-rotate-45 -translate-y-[4px]' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-obsidian border-t border-carbon">
          <div className="max-w-7xl mx-auto px-8 py-6 flex flex-col gap-4">
            {!isAuthPage && NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`font-sans text-sm uppercase tracking-widest transition-colors ${
                    active ? 'text-ivory' : 'text-stone hover:text-ivory'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
            {isAuthPage && (
              <Link href="/" className="font-sans text-sm uppercase tracking-widest text-stone hover:text-ivory transition-colors">
                ← Back to Site
              </Link>
            )}
            <div className="border-t border-carbon pt-4 mt-2 flex flex-col gap-4">
              <Link
                href="/login"
                className="font-sans text-sm uppercase tracking-widest text-gold hover:text-ivory transition-colors"
              >
                Investor Login
              </Link>
              {!isAuthPage && (
                <Link
                  href="/onboarding"
                  className="inline-block text-center px-8 py-3.5 text-xs font-semibold uppercase tracking-widest border border-gold text-gold hover:bg-gold hover:text-obsidian transition-colors"
                >
                  Register as Buyer
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
