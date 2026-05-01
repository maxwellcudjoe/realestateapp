import Link from 'next/link'
import { SectionLabel } from '@/components/ui/SectionLabel'

export const metadata = {
  title: 'Terms & Conditions | Rêve Bâtir Realty',
  description:
    'The terms governing the use of revebatir.co.uk and our property deal sourcing service.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-obsidian pt-[72px]">
      <div className="max-w-3xl mx-auto px-8 py-20">
        <SectionLabel className="mb-4">Legal</SectionLabel>
        <h1 className="font-serif text-5xl font-light text-ivory mb-3">
          Terms &amp; Conditions
        </h1>
        <p className="font-sans text-xs text-stone tracking-wide mb-12">
          Last updated: [DATE]
        </p>

        <div className="font-sans text-sm font-light text-stone leading-relaxed space-y-8">
          {/* Important notice */}
          <section className="border-l-2 border-gold pl-6 py-2">
            <p className="text-ivory">
              <span className="text-gold font-semibold uppercase tracking-widest text-xs block mb-2">Important — Please Read</span>
              Rêve Bâtir Realty is a property deal sourcer, not a regulated financial services firm. We are not authorised or regulated by the Financial Conduct Authority. We do not provide investment, mortgage, tax, or legal advice. Property investment involves risk, including the loss of capital. Past performance is not indicative of future results. You should always take independent professional advice before completing any property purchase.
            </p>
          </section>

          {/* 1. Definitions */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">1. Definitions</h2>
            <ul className="list-disc list-inside space-y-2 marker:text-gold">
              <li><span className="text-ivory">“We”, “us”, “our”, “the Sourcer”</span> — Rêve Bâtir Realty, company number <span className="text-gold">[XXXXXXXX]</span>, registered in England &amp; Wales.</li>
              <li><span className="text-ivory">“You”, “the Buyer”</span> — the individual or company who registers with us as an investor or instructs us to source a property.</li>
              <li><span className="text-ivory">“Deal”</span> — a specific property opportunity we present to you.</li>
              <li><span className="text-ivory">“Deal Pack”</span> — the document we provide containing property details, financials, comparables, and supporting evidence for a given Deal.</li>
              <li><span className="text-ivory">“Sourcing Fee”</span> — the fee payable to us for introducing a property which you proceed to acquire, as set out in section 6.</li>
            </ul>
          </section>

          {/* 2. About us */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">2. About us</h2>
            <p>
              Rêve Bâtir Realty is a UK-based property deal-sourcing firm. We identify off-market and below-market-value residential properties, perform initial due diligence, and present them to investors who match the property’s strategy and budget.
            </p>
            <p className="mt-3">
              Registered office: <span className="text-gold">[Registered office address]</span>.
              Companies House number: <span className="text-gold">[XXXXXXXX]</span>.
              ICO data controller registration: <span className="text-gold">[ZXXXXXXX]</span>.
              HMRC AML supervision number: <span className="text-gold">[XML123456]</span>.
            </p>
          </section>

          {/* 3. Regulatory status & risk warning */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">3. Regulatory status &amp; risk</h2>
            <p>
              Rêve Bâtir Realty is <span className="text-ivory">not authorised or regulated by the Financial Conduct Authority (FCA)</span>. We do not provide regulated investment, financial promotion, mortgage, tax, or legal advice. Nothing in any Deal Pack, marketing material, or communication from us constitutes a personal recommendation or financial advice.
            </p>
            <p className="mt-3">
              Property is an illiquid asset whose value can fall as well as rise. Yields, rental income, and below-market-value (BMV) figures are estimates based on available market data and our judgement, and are not guarantees of future performance or actual returns.
            </p>
            <p className="mt-3">
              You are responsible for forming your own view on the suitability of any Deal, and for taking independent professional advice (solicitor, accountant, IFA, surveyor) before committing funds.
            </p>
          </section>

          {/* 4. Our service */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">4. Our service</h2>
            <p>Subject to these Terms, we will:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 marker:text-gold">
              <li>Match your registered criteria against properties we are sourcing.</li>
              <li>Send you Deal Packs for properties that fit your criteria.</li>
              <li>Carry out initial due diligence — desktop comparables, basic property checks, financial modelling.</li>
              <li>Make introductions to vendors, agents, surveyors, solicitors, and mortgage brokers as appropriate.</li>
              <li>Support communication between you and the vendor through to completion.</li>
            </ul>
            <p className="mt-3">
              We do not guarantee that we will source a property meeting your criteria within any particular timeframe, or at all. We do not act as an estate agent and do not exclusively represent vendors.
            </p>
          </section>

          {/* 5. Buyer registration & criteria */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">5. Buyer registration</h2>
            <p>
              By submitting your buyer profile through this website you confirm that the information you provide is accurate, that you are over 18, and that you have the legal authority and financial capacity to acquire UK property within the budget you state. We may request evidence of funds before sending you a Deal Pack.
            </p>
            <p className="mt-3">
              You may update your criteria or remove yourself from our buyer list at any time by emailing{' '}
              <a href="mailto:info@revebatir.co.uk" className="text-gold hover:text-gold-light">
                info@revebatir.co.uk
              </a>
              .
            </p>
          </section>

          {/* 6. Sourcing fees */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">6. Sourcing fees</h2>
            <p>
              Where you proceed to acquire a property we have introduced, a Sourcing Fee is payable. The amount and terms of the Sourcing Fee are stated on the relevant Deal Pack and confirmed in a separate sourcing agreement before you commit to the purchase.
            </p>
            <p className="mt-3">
              Unless agreed otherwise in writing, the Sourcing Fee:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 marker:text-gold">
              <li>is payable in cleared funds at exchange of contracts (or, where the Deal is structured otherwise, on completion);</li>
              <li>is non-refundable once exchange has taken place;</li>
              <li>is exclusive of VAT, where applicable;</li>
              <li>becomes due if you (or any party connected to you) acquire the introduced property within 24 months of introduction, whether through us, directly with the vendor, or via a third party.</li>
            </ul>
          </section>

          {/* 7. AML / KYC */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">7. Anti-money-laundering &amp; know-your-customer</h2>
            <p>
              We are supervised by HMRC under the Money Laundering Regulations 2017. Before we proceed beyond initial introductions we will carry out Customer Due Diligence, including verification of identity, address, and source of funds. We may use electronic verification providers and may decline to act, or pause our service, where checks cannot be satisfactorily completed.
            </p>
            <p className="mt-3">
              We are required by law to report suspicious activity to the National Crime Agency (NCA) and may be unable to inform you that we have done so.
            </p>
          </section>

          {/* 8. Buyer's own due diligence */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">8. Your own due diligence</h2>
            <p>
              The Deal Pack is informational. It is not a survey, valuation, or legal title report. Before committing to purchase any property you are expected to:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 marker:text-gold">
              <li>Instruct your own solicitor to carry out conveyancing searches and review the title.</li>
              <li>Instruct an independent RICS-qualified surveyor to inspect the property.</li>
              <li>Verify all financial assumptions in the Deal Pack with your own accountant or IFA.</li>
              <li>Satisfy yourself that the property is suitable for your investment objectives and risk tolerance.</li>
            </ul>
          </section>

          {/* 9. Confidentiality */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">9. Confidentiality</h2>
            <p>
              Deal Packs and any property details we share with you are confidential and provided on a need-to-know basis for the sole purpose of you assessing the Deal. You must not forward, publish, or share Deal Pack contents with any third party (other than your professional advisers acting on your behalf) without our written consent.
            </p>
          </section>

          {/* 10. Intellectual property */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">10. Intellectual property</h2>
            <p>
              All content on this website — including text, design, graphics, the Rêve Bâtir Realty name and logo, and the structure of Deal Packs — is owned by us or licensed to us, and protected under UK and international copyright and trade mark laws. You may view and print pages for personal, non-commercial use only.
            </p>
          </section>

          {/* 11. Liability */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">11. Limitation of liability</h2>
            <p>
              Nothing in these Terms limits or excludes our liability for death or personal injury caused by our negligence, for fraud or fraudulent misrepresentation, or for any matter where it would be unlawful to limit liability.
            </p>
            <p className="mt-3">
              Subject to that, our total liability to you arising out of or in connection with your use of this website or our service in respect of any single matter shall not exceed the Sourcing Fee actually paid by you to us in the twelve months immediately preceding the claim.
            </p>
            <p className="mt-3">
              We will not be liable for any indirect or consequential loss, loss of profit, loss of opportunity, loss of expected return, or loss of data.
            </p>
          </section>

          {/* 12. Force majeure */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">12. Force majeure</h2>
            <p>
              We are not liable for any failure or delay in performing our obligations to the extent such failure or delay is caused by events beyond our reasonable control, including but not limited to acts of government, civil unrest, pandemics, banking failures, or major IT outages affecting third-party platforms we rely on.
            </p>
          </section>

          {/* 13. Variation */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">13. Changes to these Terms</h2>
            <p>
              We may revise these Terms from time to time. The version posted on this site at the time you submit a registration or instruct a Deal will be the version applicable to that engagement. Material changes affecting existing engagements will be notified to you by email.
            </p>
          </section>

          {/* 14. Complaints */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">14. Complaints</h2>
            <p>
              If you have a complaint about our service, please email{' '}
              <a href="mailto:info@revebatir.co.uk" className="text-gold hover:text-gold-light">
                info@revebatir.co.uk
              </a>{' '}
              setting out the issue. We aim to acknowledge complaints within 5 business days and to provide a substantive response within 28 days.
            </p>
          </section>

          {/* 15. Governing law */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">15. Governing law &amp; jurisdiction</h2>
            <p>
              These Terms and any dispute arising out of or in connection with them are governed by the laws of England and Wales. The courts of England and Wales have exclusive jurisdiction.
            </p>
          </section>

          {/* 16. Contact */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">16. Contact</h2>
            <p>
              Rêve Bâtir Realty<br />
              <span className="text-gold">[Registered office address]</span><br />
              Email:{' '}
              <a href="mailto:info@revebatir.co.uk" className="text-gold hover:text-gold-light">
                info@revebatir.co.uk
              </a>
            </p>
          </section>

          {/* Back link */}
          <div className="pt-8 border-t border-carbon">
            <Link
              href="/"
              className="font-sans text-xs font-semibold uppercase tracking-widest text-gold hover:text-gold-light"
            >
              ← Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
