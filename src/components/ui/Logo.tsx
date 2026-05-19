import Image from 'next/image'
import Link from 'next/link'

type LogoSize = 'sm' | 'md' | 'lg' | 'xl'
type LogoVariant = 'light' | 'dark'

interface LogoProps {
  className?: string
  /**
   * `sm` — navbar / inline footer (140w)
   * `md` — form pages, modals (220w)
   * `lg` — auth pages, secondary heroes (340w)
   * `xl` — homepage hero centerpiece (520w)
   */
  size?: LogoSize
  /**
   * `light` — ivory ink, for dark backgrounds (default — most of our UI)
   * `dark` — black ink, for light backgrounds (PDFs, email, light pages)
   */
  variant?: LogoVariant
  /**
   * Set to `null` to render an unwrapped image (e.g. in centred heroes
   * where the parent already controls layout).
   */
  href?: string | null
}

// PNG natural aspect is 1600:1066 ≈ 1.501:1. Pick widths and compute heights
// so the Image element matches the natural shape and Next.js can serve the
// right responsive size.
const SIZES: Record<LogoSize, { width: number; height: number }> = {
  sm: { width: 140, height: 93 },
  md: { width: 220, height: 147 },
  lg: { width: 340, height: 227 },
  xl: { width: 520, height: 347 },
}

export function Logo({
  className = '',
  size = 'sm',
  variant = 'light',
  href = '/',
}: LogoProps) {
  const { width, height } = SIZES[size]
  const src = variant === 'light' ? '/brand/logo-full-light.png' : '/brand/logo-full.png'

  const img = (
    <Image
      src={src}
      alt="Rêve Bâtir Realty"
      width={width}
      height={height}
      priority={size === 'lg' || size === 'xl'}
      className="object-contain h-auto"
      sizes={`${width}px`}
    />
  )

  if (href === null) {
    return <div className={`inline-block ${className}`}>{img}</div>
  }

  return (
    <Link
      href={href}
      className={`inline-flex items-center no-underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold ${className}`}
      aria-label="Rêve Bâtir Realty — home"
    >
      {img}
    </Link>
  )
}
