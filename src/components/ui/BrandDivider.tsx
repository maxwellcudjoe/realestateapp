import Image from 'next/image'

/**
 * A brand-aware section divider — two faint gold rules with the
 * architectural roof mark centred between them. Used to break up
 * homepage sections with the brand's own visual motif rather than
 * a generic line.
 */
export function BrandDivider({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center gap-6 py-4 ${className}`}
    >
      <div className="h-px w-24 bg-gradient-to-r from-transparent via-gold/40 to-gold/60" />
      <Image
        src="/brand/logo-mark-gold.png"
        alt=""
        width={56}
        height={56}
        className="opacity-70"
      />
      <div className="h-px w-24 bg-gradient-to-l from-transparent via-gold/40 to-gold/60" />
    </div>
  )
}
