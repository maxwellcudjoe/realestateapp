import { SectionLabel } from '@/components/ui/SectionLabel'
import { GoldDivider } from '@/components/ui/GoldDivider'
import { Button } from '@/components/ui/Button'

const VALUES = [
  {
    name: 'Integrity',
    desc: 'Compliance is foundational, not optional. Every deal is sourced within HMRC and FCA guidelines.',
  },
  {
    name: 'Expertise',
    desc: 'Deep knowledge of UK property markets, deal structures, and investor requirements.',
  },
  {
    name: 'Results',
    desc: 'Deals that perform — verified below market value, strong yields, full due diligence.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-obsidian pt-[72px]">
      {/* Hero */}
      <section className="relative py-32 px-8 text-center border-b border-carbon overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 60% at 50% 100%, rgba(201,168,76,0.05) 0%, transparent 70%)',
          }}
        />
        <SectionLabel className="mb-5 relative">Our Story</SectionLabel>
        <h1 className="font-serif text-5xl md:text-6xl font-light text-ivory leading-tight relative max-w-2xl mx-auto">
          Built on integrity.<br />Driven by results.
        </h1>
      </section>

      {/* Founder */}
      <section className="max-w-7xl mx-auto px-8 py-20 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-12 items-start border-b border-carbon">
        <div className="w-44 h-56 bg-charcoal border border-carbon flex items-center justify-center flex-shrink-0">
          <p className="font-sans text-xs uppercase tracking-widest text-stone text-center leading-loose">
            Professional<br />Headshot
          </p>
        </div>

        <div>
          <SectionLabel className="mb-3">Founder</SectionLabel>
          <h2 className="font-serif text-3xl font-light text-ivory mb-5">
            Dream Build Property Group
          </h2>
          <p className="font-sans text-sm font-light text-stone leading-relaxed mb-4">
            Founded by a property professional with years of experience navigating the UK investment market, Dream Build Property Group was created to bridge the gap between motivated sellers and serious investors — with full compliance, transparency, and due diligence at every step.
          </p>
          <p className="font-sans text-sm font-light text-stone leading-relaxed">
            We work with investors at every stage — from those building their first buy-to-let portfolio to experienced landlords scaling into HMOs and commercial conversions. Every deal we bring to market is one we would be proud to acquire ourselves.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-7xl mx-auto px-8 py-16 border-b border-carbon">
        <SectionLabel className="mb-5">Mission</SectionLabel>
        <blockquote className="border-l-2 border-gold pl-8 max-w-2xl">
          <p className="font-serif text-3xl font-light italic text-ivory leading-snug">
            "To make serious property investment accessible, transparent, and profitable."
          </p>
        </blockquote>
      </section>

      {/* Values */}
      <section className="max-w-7xl mx-auto px-8 py-16 border-b border-carbon">
        <SectionLabel className="mb-12">Our Values</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-carbon">
          {VALUES.map(({ name, desc }) => (
            <div key={name} className="bg-obsidian p-8">
              <h3 className="font-serif text-2xl font-normal text-ivory mb-3">{name}</h3>
              <GoldDivider className="mb-5" />
              <p className="font-sans text-sm font-light text-stone leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-8 py-16 flex flex-col sm:flex-row items-center justify-between gap-8">
        <p className="font-serif text-2xl font-light text-ivory">
          Ready to start your investment journey?
        </p>
        <Button href="/register">Register as a Buyer</Button>
      </section>
    </div>
  )
}
