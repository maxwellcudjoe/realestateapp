import Link from 'next/link'
import { SectionLabel } from '@/components/ui/SectionLabel'

export const metadata = {
  title: 'Privacy Policy | Rêve Bâtir Realty',
  description:
    'How Rêve Bâtir Realty collects, uses, and protects your personal data under UK GDPR.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-obsidian pt-[72px]">
      <div className="max-w-3xl mx-auto px-8 py-20">
        <SectionLabel className="mb-4">Legal</SectionLabel>
        <h1 className="font-serif text-5xl font-light text-ivory mb-3">
          Privacy Policy
        </h1>
        <p className="font-sans text-xs text-stone tracking-wide mb-12">
          Last updated: [DATE]
        </p>

        <div className="font-sans text-sm font-light text-stone leading-relaxed space-y-8">
          {/* 1. Who we are */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">1. Who we are</h2>
            <p>
              Rêve Bâtir Realty (“we”, “us”, “our”) is the data controller for the personal information collected through this website. We are registered in England &amp; Wales under company number <span className="text-gold">[XXXXXXXX]</span>, with registered office at <span className="text-gold">[Registered office address]</span>.
            </p>
            <p className="mt-3">
              We are registered as a data controller with the Information Commissioner’s Office (ICO) under registration number <span className="text-gold">[ZXXXXXXX]</span>, and supervised by HMRC under the Money Laundering, Terrorist Financing and Transfer of Funds (Information on the Payer) Regulations 2017 (registration <span className="text-gold">[XML123456]</span>).
            </p>
            <p className="mt-3">
              For any privacy-related question, contact{' '}
              <a href="mailto:info@revebatir.co.uk" className="text-gold hover:text-gold-light">
                info@revebatir.co.uk
              </a>
              .
            </p>
          </section>

          {/* 2. What data we collect */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">2. What information we collect</h2>
            <p>We collect personal information that you give us directly when you:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 marker:text-gold">
              <li>Register as a buyer (full name, email, phone, investment budget, preferred strategy, buyer type, target areas).</li>
              <li>Submit a contact enquiry or request a deal pack (name, email, message, deal reference if any).</li>
              <li>Correspond with us by email, phone, WhatsApp, or in person.</li>
            </ul>
            <p className="mt-3">
              When you proceed to acquire a property through us, we will additionally collect identification and proof-of-funds documentation as required under our anti-money laundering obligations (Customer Due Diligence — passport or driving licence, proof of address, source of funds documentation).
            </p>
            <p className="mt-3">
              We also collect limited technical information automatically: IP address, browser type, device type, pages visited, and referrer URL. We do not currently use third-party advertising or behavioural tracking cookies.
            </p>
          </section>

          {/* 3. Lawful basis */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">3. Why we use your information &amp; lawful basis</h2>
            <p>Under UK GDPR (Article 6) we rely on the following lawful bases:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 marker:text-gold">
              <li><span className="text-ivory">Legitimate interest</span> — to send you property deal packs matched to the criteria you registered, to respond to enquiries, and to maintain our business records.</li>
              <li><span className="text-ivory">Performance of a contract</span> — where you instruct us to source or introduce a specific property.</li>
              <li><span className="text-ivory">Legal obligation</span> — to carry out anti-money-laundering checks, retain transaction records (HMRC AML rules), and respond to lawful requests from regulators or law enforcement.</li>
              <li><span className="text-ivory">Consent</span> — only where you have specifically opted in (for example, a future newsletter). You may withdraw consent at any time.</li>
            </ul>
          </section>

          {/* 4. Sharing */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">4. Who we share information with</h2>
            <p>We share personal information only where necessary, and only with:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 marker:text-gold">
              <li><span className="text-ivory">Service providers</span> who help us run the business — currently Microsoft Azure (UK/EU hosting), Resend (transactional email — US, with UK adequacy + standard contractual clauses), and Contentful (content management — EU). All operate under written data-processing agreements.</li>
              <li><span className="text-ivory">Professional advisers</span> — solicitors, accountants, AML compliance consultants — bound by their own confidentiality obligations.</li>
              <li><span className="text-ivory">Vendors, agents, surveyors, or solicitors</span> involved in a property transaction we are introducing, where you have asked us to make the introduction.</li>
              <li><span className="text-ivory">Regulators or law enforcement</span> where we are legally required to disclose (HMRC, NCA, ICO, FCA, courts).</li>
            </ul>
            <p className="mt-3">We do not sell or rent your personal information to anyone.</p>
          </section>

          {/* 5. International transfers */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">5. International transfers</h2>
            <p>
              Where any service provider is based outside the UK, transfers are protected by appropriate safeguards under Article 46 UK GDPR, including the UK International Data Transfer Agreement, EU Standard Contractual Clauses, or UK adequacy decisions where applicable.
            </p>
          </section>

          {/* 6. Retention */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">6. How long we keep your information</h2>
            <ul className="list-disc list-inside mt-3 space-y-2 marker:text-gold">
              <li>Buyer registrations and enquiries: while you remain on our buyer list and for up to <span className="text-ivory">2 years</span> after your last interaction, after which we will delete or anonymise your data unless you re-engage.</li>
              <li>Records of completed transactions: <span className="text-ivory">5 years</span> after the end of our business relationship, in line with HMRC AML record-keeping rules. Some financial records are kept for <span className="text-ivory">6 years</span> for tax purposes.</li>
              <li>Marketing consent records: while you remain subscribed plus 1 year after withdrawal of consent.</li>
            </ul>
          </section>

          {/* 7. Your rights */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">7. Your rights</h2>
            <p>Under UK GDPR you have the right to:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 marker:text-gold">
              <li>Access a copy of the personal information we hold about you.</li>
              <li>Have inaccurate information corrected.</li>
              <li>Have your information deleted (subject to our legal-retention obligations above).</li>
              <li>Restrict or object to processing carried out under legitimate interest.</li>
              <li>Receive your information in a portable format.</li>
              <li>Withdraw consent at any time, where we rely on consent.</li>
              <li>Lodge a complaint with the ICO at{' '}
                <a href="https://ico.org.uk/concerns/" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light">
                  ico.org.uk/concerns
                </a>{' '}
                or by calling 0303 123 1113.
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{' '}
              <a href="mailto:info@revebatir.co.uk" className="text-gold hover:text-gold-light">
                info@revebatir.co.uk
              </a>
              . We will respond within one calendar month.
            </p>
          </section>

          {/* 8. Cookies */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">8. Cookies</h2>
            <p>
              This site uses only strictly-necessary cookies required for the website to function (for example, to remember form input). We do not use advertising, analytics, or behavioural-tracking cookies and therefore do not require a cookie consent banner under PECR. If we add analytics in future, we will update this policy and request your consent first.
            </p>
          </section>

          {/* 9. Security */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">9. Security</h2>
            <p>
              We use HTTPS encryption across the entire site, host with Microsoft Azure (ISO 27001 certified), restrict staff access to personal data on a need-to-know basis, and review our security practices regularly. No system is perfectly secure; if you believe your information has been compromised, contact us immediately.
            </p>
          </section>

          {/* 10. Updates */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">10. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. The “last updated” date at the top of the page reflects the most recent revision. Material changes affecting how we use existing data will be communicated by email where we hold a current address for you.
            </p>
          </section>

          {/* 11. Contact */}
          <section>
            <h2 className="font-serif text-2xl text-ivory mb-3">11. Contact</h2>
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
