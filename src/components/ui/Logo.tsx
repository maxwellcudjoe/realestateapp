import Link from 'next/link'

interface LogoProps {
  className?: string
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-4 no-underline ${className}`}>
      {/* Vertical gold rule */}
      <div className="w-px h-10 bg-gold flex-shrink-0" />
      <div>
        <p className="font-serif text-lg font-normal tracking-[0.2em] uppercase text-ivory leading-none">
          Rêve Bâtir
        </p>
        <p className="font-sans text-[0.5rem] font-medium tracking-[0.28em] uppercase text-gold mt-1">
          Wealth Ltd
        </p>
      </div>
    </Link>
  )
}
