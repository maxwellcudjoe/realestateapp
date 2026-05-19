import Link from 'next/link'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Button } from '@/components/ui/Button'
import { premiumMonthlyAmount, premiumAnnualAmount, PREMIUM_PREVIEW_HOURS } from '@/lib/subscriptions'

interface Feature {
  label: string
  free: boolean
  premium: boolean
  highlight?: boolean
}

const FEATURES: Feature[] = [
  { label: 'Matched deal alerts',                   free: true,  premium: true },
  { label: 'Full deal pack download',                free: true,  premium: true },
  { label: 'Submit offers via portal',               free: true,  premium: true },
  { label: 'Live pipeline tracking',                 free: true,  premium: true },
  { label: 'Per-deal messaging + viewing requests',  free: true,  premium: true },
  { label: 'Portfolio tracker after completion',     free: true,  premium: true },
  { label: 'GDPR data export + self-serve deletion', free: true,  premium: true },
  { label: 'Two-factor authentication (TOTP)',       free: true,  premium: true },
  { label: `${PREMIUM_PREVIEW_HOURS}-hour head start on every new deal`, free: false, premium: true, highlight: true },
  { label: 'Priority response from deal team',       free: false, premium: true, highlight: true },
  { label: 'Premium-only deal previews',             free: false, premium: true, highlight: true },
]

export function PricingBlock() {
  const monthly = premiumMonthlyAmount()
  const annual = premiumAnnualAmount()
  const annualSavingPct = Math.round(((monthly * 12 - annual) / (monthly * 12)) * 100)

  return (
    <section className="bg-[#0e0e0e] py-24 px-8" id="pricing">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <SectionLabel className="mb-4">Pricing</SectionLabel>
          <h2 className="font-serif text-4xl font-light text-ivory">Free forever, Premium when you&rsquo;re ready</h2>
          <p className="font-sans text-sm font-light text-stone mt-4 max-w-2xl mx-auto">
            No credit card to register. Upgrade or cancel any time from your portal.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-carbon">
          {/* Free */}
          <div className="bg-[#0e0e0e] p-8 flex flex-col">
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-2">Free Tier</p>
            <h3 className="font-serif text-3xl font-light text-ivory">£0</h3>
            <p className="font-sans text-xs text-stone mt-1 mb-6">forever · no card required</p>

            <ul className="space-y-2 mb-8 flex-1">
              {FEATURES.map((f) => (
                <li key={f.label} className={`flex items-start gap-3 font-sans text-sm ${f.free ? 'text-ivory' : 'text-stone/40 line-through'}`}>
                  <span className={f.free ? 'text-gold' : 'text-stone/40'}>{f.free ? '✓' : '—'}</span>
                  <span>{f.label}</span>
                </li>
              ))}
            </ul>

            <Button href="/onboarding" fullWidth variant="secondary">Register Free</Button>
          </div>

          {/* Premium */}
          <div className="bg-[#0e0e0e] p-8 flex flex-col border-l-2 border-gold/50 relative">
            <span className="absolute top-0 right-0 bg-gold text-obsidian font-sans text-[0.55rem] font-bold uppercase tracking-widest px-3 py-1">
              Recommended
            </span>
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-gold mb-2">Premium Tier</p>
            <div className="flex items-baseline gap-2">
              <h3 className="font-serif text-3xl font-light text-ivory">£{monthly}</h3>
              <span className="font-sans text-sm text-stone">/ month</span>
            </div>
            <p className="font-sans text-xs text-gold mt-1 mb-6">
              or £{annual}/year ({annualSavingPct}% saving)
            </p>

            <ul className="space-y-2 mb-8 flex-1">
              {FEATURES.map((f) => (
                <li key={f.label} className={`flex items-start gap-3 font-sans text-sm ${f.highlight ? 'text-gold' : 'text-ivory'}`}>
                  <span className="text-gold">✓</span>
                  <span className={f.highlight ? 'font-medium' : ''}>{f.label}</span>
                </li>
              ))}
            </ul>

            <Button href="/onboarding?tier=premium" fullWidth>Start Premium</Button>
          </div>
        </div>

        <p className="text-center font-sans text-xs text-stone mt-8">
          Sourcing and success fees may apply on a per-deal basis — see your portal invoices for full transparency.{' '}
          <Link href="/pricing" className="text-gold hover:underline">Full pricing details →</Link>
        </p>
      </div>
    </section>
  )
}
