import { SectionLabel } from '@/components/ui/SectionLabel'

const STEPS = [
  {
    num: '01',
    title: 'Register',
    body: '5-step wizard captures KYC + AML compliance: identity, address, source of funds, PEP status, buyer entity (individual, Ltd, LLP, trust).',
  },
  {
    num: '02',
    title: 'Set Criteria',
    body: 'Budget, strategy (BTL · HMO · Flip · Commercial · Serviced Accom), target areas (54 UK regions), timeline, mortgage status.',
  },
  {
    num: '03',
    title: 'Matched Deals',
    body: 'Email alerts when a property matches your criteria. Premium tier sees new deals 48 hours before the free tier.',
  },
  {
    num: '04',
    title: 'Respond',
    body: 'Accept, Request More Info, or Pass. Favourite deals for later. Every response is logged in your portal.',
  },
  {
    num: '05',
    title: 'Viewing',
    body: 'Request a viewing through the portal. We coordinate with the vendor. Confirmed slots show up in your calendar.',
  },
  {
    num: '06',
    title: 'Offer',
    body: 'Submit a structured offer: amount, deposit %, cash/mortgage/mixed financing, target exchange date, conditions.',
  },
  {
    num: '07',
    title: 'Pipeline',
    body: 'Watch your deal progress through Memo of Sale → Conveyancing → Survey → Mortgage → Exchanged → Completed. Deal team named at every step.',
  },
  {
    num: '08',
    title: 'Portfolio',
    body: 'Your completed property auto-enters your portfolio with document archive: title deed, EPC, gas safety, EICR, tenancy.',
  },
]

export function HowItWorks() {
  return (
    <section className="bg-[#1a1a1a] py-24 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel className="mb-4">The Full Lifecycle</SectionLabel>
          <h2 className="font-serif text-4xl font-light text-ivory">From signup to completion</h2>
          <p className="font-sans text-sm font-light text-stone mt-4 max-w-2xl mx-auto">
            Most sourcers stop after the deal pack. We track every step through to the keys in your hand.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-carbon">
          {STEPS.map(({ num, title, body }) => (
            <div key={num} className="bg-[#1a1a1a] p-6 flex flex-col gap-3">
              <span className="font-serif text-5xl font-light text-carbon leading-none select-none">
                {num}
              </span>
              <h3 className="font-sans text-xs font-semibold uppercase tracking-widest text-ivory">
                {title}
              </h3>
              <p className="font-sans text-xs font-light text-stone leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
