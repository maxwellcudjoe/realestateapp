export function SectionLabel({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p
      className={`font-sans text-[0.65rem] font-semibold uppercase tracking-widest2 text-gold ${className}`}
    >
      {children}
    </p>
  )
}
