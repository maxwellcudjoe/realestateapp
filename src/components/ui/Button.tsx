import Link from 'next/link'

interface ButtonProps {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
  fullWidth?: boolean
}

export function Button({
  children,
  href,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  className = '',
  fullWidth = false,
}: ButtonProps) {
  const base =
    'inline-block px-8 py-3.5 text-xs font-semibold uppercase tracking-widest transition-colors duration-200 border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold'

  const variants = {
    primary:
      'border-gold text-gold hover:bg-gold hover:text-obsidian',
    secondary:
      'border-carbon text-stone hover:border-stone hover:text-ivory',
  }

  const classes = `${base} ${variants[variant]} ${fullWidth ? 'w-full text-center' : ''} ${className}`

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${classes} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}
