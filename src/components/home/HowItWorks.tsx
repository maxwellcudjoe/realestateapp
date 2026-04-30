import { SectionLabel } from '@/components/ui/SectionLabel'

const STEPS = [
  {
    num: '01',
    title: 'Register as a Buyer',
    body: 'Complete the investor registration form with your contact details and preferences.',
  },
  {
    num: '02',
    title: 'Tell Us Your Criteria',
    body: 'Share your budget, preferred strategy (BTL, HMO, Flip), and target locations.',
  },
  {
    num: '03',
    title: 'Receive Matched Deal Packs',
    body: 'We send you verified, below-market-value deal packs matched to your exact criteria.',
  },
  {
    num: '04',
    title: 'Complete & Build Your Portfolio',
    body: 'Instruct your solicitor, complete the purchase, and grow your property portfolio.',
  },
]

export function HowItWorks() {
  return (
    <section className="bg-[#0d0d0d] py-24 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel className="mb-4">The Process</SectionLabel>
          <h2 className="font-serif text-4xl font-light text-ivory">How It Works</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-carbon">
          {STEPS.map(({ num, title, body }) => (
            <div key={num} className="bg-[#0d0d0d] p-8 flex flex-col gap-4">
              <span className="font-serif text-5xl font-light text-carbon leading-none select-none">
                {num}
              </span>
              <h3 className="font-sans text-xs font-semibold uppercase tracking-widest text-ivory">
                {title}
              </h3>
              <p className="font-sans text-sm font-light text-stone leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
