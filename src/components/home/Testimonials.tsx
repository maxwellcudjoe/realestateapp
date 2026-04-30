import { SectionLabel } from '@/components/ui/SectionLabel'

const TESTIMONIALS = [
  {
    quote:
      'Rêve Bâtir found us a 14% BMV deal in Leeds that we would never have sourced ourselves. Seamless from start to finish.',
    name: 'James H.',
    role: 'BTL Investor · Leeds',
  },
  {
    quote:
      'Professional, compliant, and they actually deliver. The deal pack gave us everything we needed to proceed with confidence.',
    name: 'Sarah K.',
    role: 'Portfolio Investor · Manchester',
  },
  {
    quote:
      'Registered my criteria on a Monday, had a matched deal pack by Wednesday. This is how sourcing should work.',
    name: 'Marcus T.',
    role: 'HMO Investor · Birmingham',
  },
]

export function Testimonials() {
  return (
    <section className="bg-[#0e0e0e] py-24 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel className="mb-4">Investor Feedback</SectionLabel>
          <h2 className="font-serif text-4xl font-light text-ivory">What Investors Say</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-carbon">
          {TESTIMONIALS.map(({ quote, name, role }) => (
            <div key={name} className="bg-charcoal p-8 flex flex-col gap-4">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-gold text-sm">★</span>
                ))}
              </div>
              <blockquote className="font-serif text-lg font-light italic text-stone leading-relaxed flex-1">
                "{quote}"
              </blockquote>
              <div>
                <p className="font-sans text-xs font-semibold uppercase tracking-widest text-ivory">{name}</p>
                <p className="font-sans text-xs text-carbon mt-0.5">{role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
