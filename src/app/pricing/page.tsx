import type { Metadata } from 'next'
import Link from 'next/link'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Button } from '@/components/ui/Button'
import { PricingBlock } from '@/components/home/PricingBlock'
import { Faq } from '@/components/home/Faq'
import { premiumMonthlyAmount, premiumAnnualAmount, PREMIUM_PREVIEW_HOURS } from '@/lib/subscriptions'

export const metadata: Metadata = {
  title: 'Pricing — Free Forever, Premium When You’re Ready',
  description:
    'Free registration with full deal access. Premium tier from £20/month for a 48-hour head start on every new deal. Transparent per-deal sourcing and success fees, invoiced through your portal.',
  alternates: { canonical: '/pricing' },
}

const FEE_SCHEDULE = [
  {
    name: 'Registration',
    amount: 'Free',
    detail: 'No card, no commitment. Browse deals, submit responses, manage your profile.',
  },
  {
    name: 'Premium subscription',
    amount: 'From £49/mo · £499/yr',
    detail: `${PREMIUM_PREVIEW_HOURS}-hour head start on every new deal · priority response from deal team · cancellable any time from your portal.`,
  },
  {
    name: 'Sourcing fee (per deal)',
    amount: 'Quoted per deal',
    detail: 'Charged only when you commit to proceed (offer accepted). Transparent in your portal invoice before you sign.',
  },
  {
    name: 'Success fee (per completion)',
    amount: '% of purchase price',
    detail: 'Charged only on completion. Auto-suggested at 1% of the accepted offer; can be discounted for Premium members and repeat investors.',
  },
]

const PAYMENT_FLOW = [
  'Invoice issued via your portal with our HMRC bank details',
  'You pay by bank transfer to the Rêve Bâtir Realty account (we do not handle card payments)',
  'We mark the invoice paid against the bank reference within 1 business day',
  'Property purchase money flows separately, through your solicitor’s client account',
]

export default function PricingPage() {
  const monthly = premiumMonthlyAmount()
  const annual = premiumAnnualAmount()

  return (
    <div className="bg-obsidian pt-[120px] pb-12">
      <div className="max-w-7xl mx-auto px-8 pb-12 text-center">
        <SectionLabel className="mb-4">Pricing</SectionLabel>
        <h1 className="font-serif text-5xl md:text-6xl font-light text-ivory mb-4">
          Transparent pricing. No surprises.
        </h1>
        <p className="font-sans text-base font-light text-stone max-w-2xl mx-auto">
          Free to register. £{monthly}/month Premium tier for a {PREMIUM_PREVIEW_HOURS}-hour head start.
          Per-deal sourcing and success fees only charged when you commit.
        </p>
      </div>

      <PricingBlock />

      <section className="py-24 px-8 bg-[#1b1b1b]">
        <div className="max-w-5xl mx-auto">
          <SectionLabel className="mb-4 text-center block">Per-Deal Fees</SectionLabel>
          <h2 className="font-serif text-4xl font-light text-ivory text-center mb-12">
            How we get paid on each transaction
          </h2>

          <div className="border border-carbon">
            {FEE_SCHEDULE.map((fee, i) => (
              <div
                key={fee.name}
                className={`grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-5 ${i > 0 ? 'border-t border-carbon' : ''}`}
              >
                <div className="md:col-span-4">
                  <p className="font-sans text-sm font-medium text-ivory">{fee.name}</p>
                  <p className="font-sans text-base text-gold mt-1">{fee.amount}</p>
                </div>
                <div className="md:col-span-8">
                  <p className="font-sans text-sm font-light text-stone leading-relaxed">{fee.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-8 bg-obsidian">
        <div className="max-w-5xl mx-auto">
          <SectionLabel className="mb-4 text-center block">Payment Flow</SectionLabel>
          <h2 className="font-serif text-4xl font-light text-ivory text-center mb-4">
            Bank transfer only — solicitor handles property funds
          </h2>
          <p className="font-sans text-sm font-light text-stone text-center mb-12 max-w-2xl mx-auto">
            We don&rsquo;t take card payments and we don&rsquo;t hold investor money. Every penny is traceable.
          </p>

          <ol className="grid grid-cols-1 md:grid-cols-2 gap-px bg-carbon">
            {PAYMENT_FLOW.map((step, i) => (
              <li key={i} className="bg-obsidian p-8 flex gap-4">
                <span className="font-serif text-4xl text-gold/40 leading-none flex-shrink-0">
                  0{i + 1}
                </span>
                <p className="font-sans text-sm font-light text-ivory leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Faq />

      <section className="py-24 px-8 bg-[#0e0e0e] text-center">
        <h2 className="font-serif text-4xl font-light text-ivory mb-4">Still deciding?</h2>
        <p className="font-sans text-sm font-light text-stone mb-8 max-w-xl mx-auto">
          You can register free now and upgrade to Premium when you see the right deal.
          Annual Premium saves £{Math.max(0, monthly * 12 - annual)} versus paying monthly.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button href="/onboarding">Register Free</Button>
          <Button href="/onboarding?tier=premium" variant="secondary">
            Start Premium · £{monthly}/mo
          </Button>
        </div>
        <p className="font-sans text-xs text-stone mt-8">
          Need a tailored arrangement?{' '}
          <Link href="/contact" className="text-gold hover:underline">Contact our team →</Link>
        </p>
      </section>
    </div>
  )
}
