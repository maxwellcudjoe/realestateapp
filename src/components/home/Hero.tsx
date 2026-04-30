import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-8 overflow-hidden bg-obsidian">
      {/* Animated gold glow — CSS only, no JS */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none animate-gold-pulse"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 60%, rgba(201,168,76,0.12) 0%, transparent 70%)',
        }}
      />

      {/* Secondary static glow for depth */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 40% 30% at 20% 40%, rgba(201,168,76,0.04) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl">
        <Logo className="mb-4" />

        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-light text-ivory leading-[1.05]">
          We Find The Deal.<br />
          You Build The Wealth.
        </h1>

        <p className="font-sans text-sm font-light tracking-wider text-stone max-w-lg leading-relaxed">
          UK property deal sourcing, acquisition, and investment — done properly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <Button href="/deals">View Current Deals</Button>
          <Button href="/register" variant="secondary">Work With Us</Button>
        </div>
      </div>
    </section>
  )
}
