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
        <Logo className="mb-4" />

        <p className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-gold">
          HMRC MLR · ICO Registered · UK-Wide
        </p>

        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-light text-ivory leading-[1.05]">
          The UK Property Deal Platform<br />
          <span className="text-gold">Built For Investors.</span>
        </h1>

        <p className="font-sans text-base md:text-lg font-light tracking-wide text-stone max-w-2xl leading-relaxed">
          Verified below-market-value deals. Pipeline tracking from offer to completion. KYC, AML, and audit trail
          built in. All in one fully-compliant investor portal.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <Button href="/deals">Browse Current Deals</Button>
          <Button href="/onboarding" variant="secondary">Register Free</Button>
        </div>

        <p className="font-sans text-xs text-stone/60 mt-2">
          Premium tier from £20/month — 48-hour head start on every new deal
        </p>
      </div>
    </section>
  )
}
