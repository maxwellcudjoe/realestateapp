import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center text-center px-8">
      <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-6">404</p>
      <h1 className="font-serif text-5xl font-light text-ivory mb-6">Page Not Found</h1>
      <p className="font-sans text-sm font-light text-stone mb-10 max-w-sm leading-relaxed">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="px-8 py-3.5 border border-gold text-gold font-sans text-xs font-semibold uppercase tracking-widest hover:bg-gold hover:text-obsidian transition-colors"
      >
        Return Home
      </Link>
    </div>
  )
}
