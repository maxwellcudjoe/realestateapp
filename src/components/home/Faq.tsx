import { SectionLabel } from '@/components/ui/SectionLabel'
import { premiumMonthlyAmount } from '@/lib/subscriptions'

interface FaqEntry {
  q: string
  a: string
}

function buildFaqs(monthly: number): FaqEntry[] {
  return [
    {
      q: 'Are you regulated?',
      a: 'Yes. We&rsquo;re registered with HMRC under the Money Laundering Regulations 2017. Property sourcing itself isn&rsquo;t FCA-regulated, but money handling is — and we don&rsquo;t handle your money. Every payment flows through your solicitor&rsquo;s client account. We&rsquo;re also an ICO-registered Data Controller (00014027391) and a Companies House-registered limited company (17201842).',
    },
    {
      q: 'What does it cost?',
      a: `Registration is free, forever. The optional Premium tier is £${monthly}/month (or £${Math.round(monthly * 12 * 0.83)}/year) and gives you a 48-hour head start on every new deal plus priority response from the deal team. On a per-deal basis there are transparent sourcing and success fees, invoiced through your portal — you only ever pay when you commit.`,
    },
    {
      q: 'How long does KYC take?',
      a: 'First review is typically 1–3 business days after you upload your documents. We re-verify every 18 months per MLR 2017 retention requirements. The portal shows you exactly which stage you&rsquo;re at and what we need from you.',
    },
    {
      q: 'What counts as a below-market-value deal?',
      a: 'A property priced at least 10% below independent market comparables. Every BMV claim has at least three comparables attached in the deal pack, with source links to Rightmove, Zoopla, and Land Registry data.',
    },
    {
      q: 'What if I view a property and decide not to buy?',
      a: 'No fee. The sourcing fee is only invoiced when you commit to proceed — i.e. when the vendor accepts your offer. The success fee is only invoiced on completion. You&rsquo;re never billed for browsing.',
    },
    {
      q: 'Can I buy through a limited company or SPV?',
      a: 'Yes. Our 5-step onboarding captures your buying entity (Individual, Ltd Company, LLP, or Trust) and your Companies House number if applicable. The deal team handles the SPV-specific paperwork for stamp duty and registration.',
    },
    {
      q: 'Are you the estate agent or just the introducer?',
      a: 'We&rsquo;re the introducer. The vendor&rsquo;s estate agent and solicitor handle the formal sale. Our value-add is finding the deal, verifying it, packaging it, and tracking every step in your portal — so you can see exactly where things stand without chasing anyone.',
    },
    {
      q: 'What happens after I complete on a property?',
      a: 'The property auto-enters your portfolio in the portal. You can upload tenancy agreements, EPCs, gas safety certificates, EICR reports, and any other documents. We don&rsquo;t manage tenancies, but we keep all your records together in one searchable archive.',
    },
    {
      q: 'Can I export my data or delete my account?',
      a: 'Yes, both. /portal/security has a Download My Data button (full JSON export of every record we hold) and a Delete Account flow. We&rsquo;re fully GDPR Article 17 compliant. After deletion, personal data is preserved for 30 days then auto-anonymised by a daily cron.',
    },
    {
      q: 'How do I cancel Premium?',
      a: 'One click from /portal/subscription. Your access continues until the end of your paid period — no early cut-off, no refund needed. You can also re-subscribe later without losing your data.',
    },
  ]
}

export function Faq() {
  const monthly = premiumMonthlyAmount()
  const faqs = buildFaqs(monthly)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: a.replace(/&rsquo;/g, "'").replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"'),
      },
    })),
  }

  return (
    <section className="bg-obsidian py-24 px-8" id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <SectionLabel className="mb-4">FAQ</SectionLabel>
          <h2 className="font-serif text-4xl font-light text-ivory">
            Questions investors actually ask
          </h2>
        </div>

        <div className="border border-carbon">
          {faqs.map(({ q, a }, i) => (
            <details
              key={q}
              className={`group ${i > 0 ? 'border-t border-carbon' : ''}`}
            >
              <summary className="flex items-center justify-between gap-4 cursor-pointer px-6 py-5 hover:bg-charcoal/50 transition-colors">
                <span className="font-sans text-sm font-medium text-ivory">{q}</span>
                <span className="font-serif text-2xl text-gold leading-none group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="px-6 pb-5 -mt-1">
                <p
                  className="font-sans text-sm font-light text-stone leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: a }}
                />
              </div>
            </details>
          ))}
        </div>

        <p className="text-center font-sans text-xs text-stone mt-8">
          Still have questions? <a href="/contact" className="text-gold hover:underline">Get in touch →</a>
        </p>
      </div>
    </section>
  )
}
