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

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-4xl">
        {/* The wordmark itself is now the visual centerpiece — ink-settle entry */}
        <div className="animate-ink-settle mb-2">
          <Logo size="xl" href={null} />
        </div>

        {/* Calligraphy-style underline that shimmers with gold */}
        <div
          className="h-px w-40 bg-gold/40 animate-gold-shimmer animate-ink-settle"
          style={{ animationDelay: '0.3s' }}
          aria-hidden="true"
        />

        <p
          className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-gold animate-ink-settle"
          style={{ animationDelay: '0.5s' }}
        >
          HMRC MLR · ICO Registered · UK-Wide
        </p>

        <h1
          className="font-serif text-4xl md:text-5xl lg:text-6xl font-light text-ivory leading-[1.1] animate-ink-settle"
          style={{ animationDelay: '0.7s' }}
        >
          The UK Property Deal Platform<br />
          <span className="text-gold italic">Built For Investors.</span>
        </h1>

        <p
          className="font-sans text-base md:text-lg font-light tracking-wide text-stone max-w-2xl leading-relaxed animate-ink-settle"
          style={{ animationDelay: '0.9s' }}
        >
          Verified below-market-value deals. Pipeline tracking from offer to completion. KYC, AML, and audit trail
          built in. All in one fully-compliant investor portal.
        </p>

        <div
          className="flex flex-col sm:flex-row gap-4 mt-2 animate-ink-settle"
          style={{ animationDelay: '1.1s' }}
        >
          <Button href="/deals">Browse Current Deals</Button>
          <Button href="/onboarding" variant="secondary">Register Free</Button>
        </div>

        <p
          className="font-sans text-xs text-stone/60 mt-2 animate-ink-settle"
          style={{ animationDelay: '1.3s' }}
        >
          Premium tier from £20/month — 48-hour head start on every new deal
        </p>
      </div>
    </section>
  )
}
