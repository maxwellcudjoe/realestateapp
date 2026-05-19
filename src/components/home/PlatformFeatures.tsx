import { SectionLabel } from '@/components/ui/SectionLabel'

const FEATURES = [
  {
    title: 'Verified Deal Sourcing',
    body: 'Every property independently valued, below-market-value verified against comparables, and packaged with a full due-diligence report. No auctions, no inflated prices.',
  },
  {
    title: 'Investor Portal',
    body: 'Track every deal you respond to. See the live stage. Message your deal team. Upload documents. Request viewings. All in one dashboard, not your inbox.',
  },
  {
    title: '48-Hour Premium Head Start',
    body: 'Premium subscribers see every new deal 48 hours before the free tier. First mover advantage on the best opportunities.',
  },
  {
    title: 'End-to-End Pipeline',
    body: 'From offer through memo of sale, conveyancing, survey, mortgage, exchange, to completion — every step is on one dashboard with your deal team named.',
  },
  {
    title: 'Compliance Built In',
    body: 'HMRC MLR-registered. Full KYC/AML at onboarding. ICO-registered data controller. GDPR Article 17 self-serve export and deletion. 2FA + audit log on every action.',
  },
  {
    title: 'Portfolio Tracker',
    body: 'When a deal completes, the property auto-enters your portfolio. Upload tenancy docs, EPC, gas safety, EICR. Track tenancy status and value estimate over time.',
  },
]

export function PlatformFeatures() {
  return (
    <section className="bg-[#1b1b1b] py-24 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel className="mb-4">The Platform</SectionLabel>
          <h2 className="font-serif text-4xl font-light text-ivory">
            Everything you need to invest properly
          </h2>
          <p className="font-sans text-sm font-light text-stone mt-4 max-w-2xl mx-auto">
            We&rsquo;re not a newsletter. We&rsquo;re the platform you use to find a deal,
            track every step to completion, and manage the property afterwards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-carbon">
          {FEATURES.map(({ title, body }, i) => (
            <div key={title} className="bg-[#1b1b1b] p-8 flex flex-col gap-3">
              <p className="font-serif text-3xl font-light text-gold/40 leading-none mb-2">
                0{i + 1}
              </p>
              <h3 className="font-serif text-xl font-normal text-ivory">{title}</h3>
              <p className="font-sans text-sm font-light text-stone leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
