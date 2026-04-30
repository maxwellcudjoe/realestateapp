import { SectionLabel } from '@/components/ui/SectionLabel'

const TRUST_SIGNALS = [
  'Fully compliant — HMRC registered under the Money Laundering Regulations',
  'Verified below-market-value deals only — every deal backed by comparables',
  'Full due diligence pack provided on every property',
  'UK-wide sourcing network covering all major investment regions',
]

export function WhyDreamBuild() {
  return (
    <section className="bg-obsidian py-24 px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* Left */}
        <div>
          <SectionLabel className="mb-6">Why Dream Build</SectionLabel>
          <blockquote className="font-serif text-3xl md:text-4xl font-light text-ivory leading-snug mb-10">
            "Most investors don't have time to find the deals.
            <span className="text-gold"> We do.</span>"
          </blockquote>
          <ul className="flex flex-col gap-4">
            {TRUST_SIGNALS.map((signal) => (
              <li key={signal} className="flex items-start gap-4">
                <div className="w-4 h-px bg-gold mt-2.5 flex-shrink-0" />
                <p className="font-sans text-sm font-light text-stone leading-relaxed">{signal}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Right — trust badges */}
        <div className="flex flex-col gap-3">
          {[
            '✓  HMRC Registered — AML Compliant',
            '✓  ICO Registered Data Controller',
            '✓  Full Due Diligence on Every Deal',
            '✓  UK-Wide Sourcing Network',
          ].map((badge) => (
            <div
              key={badge}
              className="bg-charcoal border border-carbon border-l-2 border-l-gold px-5 py-4 font-sans text-sm text-stone"
            >
              {badge}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
