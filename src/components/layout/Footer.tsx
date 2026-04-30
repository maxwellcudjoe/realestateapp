import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

const FOOTER_LINKS = [
  { href: '/',         label: 'Home' },
  { href: '/about',    label: 'About' },
  { href: '/deals',    label: 'Deals' },
  { href: '/register', label: 'Register' },
  { href: '/contact',  label: 'Contact' },
]

const COMPLIANCE =
  'Dream Build Property Group Ltd is registered with HMRC under the Money Laundering Regulations. ICO registered. Company No. [XXXXXXXX]. All deals are sourced for the purposes of introduction only. Dream Build Property Group Ltd is not authorised or regulated by the Financial Conduct Authority. Property investment involves risk. Past performance is not indicative of future results.'

export function Footer() {
  return (
    <footer className="bg-[#070707] border-t border-carbon">
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Top row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-8 border-b border-carbon">
          <Logo />

          <nav>
            <ul className="flex flex-wrap gap-8 list-none">
              {FOOTER_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="font-sans text-[0.6rem] font-medium uppercase tracking-widest text-stone hover:text-ivory transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Social icons */}
          <div className="flex gap-3">
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="w-8 h-8 border border-carbon flex items-center justify-center text-stone hover:border-gold hover:text-gold transition-colors text-[0.6rem] font-semibold"
            >
              in
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-8 h-8 border border-carbon flex items-center justify-center text-stone hover:border-gold hover:text-gold transition-colors text-[0.6rem] font-semibold"
            >
              ig
            </a>
          </div>
        </div>

        {/* Compliance */}
        <p className="mt-6 font-sans text-[0.5rem] text-[#383838] leading-relaxed max-w-3xl">
          {COMPLIANCE}
        </p>
      </div>
    </footer>
  )
}
