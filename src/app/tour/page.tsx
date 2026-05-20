import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Button } from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'Tour the Investor Portal',
  description:
    'See inside the Rêve Bâtir investor portal before you register. Live pipeline tracking, structured offers, viewing requests, deal team handoff, portfolio archive, and full GDPR + AML compliance.',
  alternates: { canonical: '/tour' },
  openGraph: {
    title: 'Tour the Investor Portal · Rêve Bâtir',
    description:
      'See inside the investor portal before you register — pipeline tracking, structured offers, viewings, portfolio archive, and compliance built in.',
    url: '/tour',
    type: 'website',
    images: [
      {
        url: '/og/tour.png',
        width: 1200,
        height: 630,
        alt: 'Rêve Bâtir Tour — the investor portal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tour the Investor Portal · Rêve Bâtir',
    description: 'See inside the investor portal before you register.',
    images: ['/og/tour.png'],
  },
}

interface TourStop {
  badge: string
  title: string
  body: string
  highlights: string[]
  imageSrc?: string
  imageAlt?: string
}

const TOUR: TourStop[] = [
  {
    badge: '01 · Onboarding',
    title: 'KYC and AML in 5 steps',
    body:
      'A guided wizard captures everything we need to satisfy MLR 2017 — once, and only once. ID + proof of address upload directly into the portal. PEP flagging routes you to enhanced due diligence automatically.',
    highlights: [
      'Buyer entity: Individual · Ltd · LLP · Trust',
      'Source of funds with structured detail capture',
      'Tax residency (drives SDLT surcharge flag)',
      'Save and resume — your draft stays for 14 days',
    ],
  },
  {
    badge: '02 · Matched Deals',
    title: 'A feed tailored to your criteria',
    body:
      'Set your budget band, strategy (BTL / HMO / Flip / Commercial / Serviced Accom), and target areas (54 UK regions). Matched deals appear with full deal packs — comparables, financials, area data, photos.',
    highlights: [
      'Multi-select strategy and target areas',
      'Premium gets a 48-hour head start on every deal',
      'Favourite deals from any source — public Contentful pages too',
      'Email alerts on new matches (configurable)',
    ],
  },
  {
    badge: '03 · Response + Viewing',
    title: 'Express interest, schedule a viewing',
    body:
      'Accept, request more info, or pass. Accepting unlocks the viewing-request flow. We confirm slots with the vendor and notify you in the portal. Proof-of-funds upload is enforced before viewings (6-month freshness check).',
    highlights: [
      'Live status: REQUESTED → CONFIRMED → COMPLETED',
      'Investor and admin notes on every viewing',
      'Reschedule via portal — no email chains',
      'Calendar export coming soon',
    ],
  },
  {
    badge: '04 · Structured Offer',
    title: 'Submit an offer the vendor can act on',
    body:
      'Not a one-line email. The portal asks for offer amount, deposit %, cash/mortgage/mixed financing, target exchange date, and conditions. Counter-offer flow built in — if vendor rejects, you can submit a revised offer.',
    highlights: [
      'Structured conditions field (bullet list, free text)',
      'Auto-advance: offer submission moves the deal to OFFER_PENDING',
      'Vendor decision recorded in your portal with explanation',
      'Premium gets priority response time',
    ],
  },
  {
    badge: '05 · Pipeline Tracking',
    title: 'Every step from offer to keys',
    body:
      'Ten canonical stages — PROPOSED → OFFER_PENDING → OFFER_ACCEPTED → MEMO_OF_SALE → CONVEYANCING → SURVEY → MORTGAGE → EXCHANGED → COMPLETED (with FALLEN_THROUGH as terminal). Your deal team is named at every step.',
    highlights: [
      'Live stage indicator with timeline of past changes',
      'Deal team card: lead admin, solicitor, broker contacts',
      'Per-deal messaging thread — no chasing by email',
      'Per-deal document room (admin-visible vs investor-visible scopes)',
    ],
  },
  {
    badge: '06 · Invoicing',
    title: 'Transparent fees, paid by bank transfer',
    body:
      'No card payments. Every sourcing fee, success fee, and subscription is invoiced in the portal with our HMRC bank details. PDFs are A4-formatted and ready for your accountant. Bank reference captured against PAID status.',
    highlights: [
      'RB-YYYY-NNNN invoice numbering (atomic, monotonic)',
      'Outstanding and lifetime-paid stats',
      'Subscription invoices auto-generated weekly by cron',
      'We never hold your money — property funds via solicitor',
    ],
  },
  {
    badge: '07 · Portfolio',
    title: 'After completion, the property is yours to track',
    body:
      'When a deal hits COMPLETED, a Property auto-enters your portfolio. Upload tenancy agreements, EPCs, gas safety, EICR — anything you want to keep together. Track tenancy status and value estimate over time.',
    highlights: [
      'Per-property document archive (no size limits, blob-backed)',
      'Tenancy state: Vacant · Let · Pending',
      'Optional value-estimate updates (drives portfolio total)',
      'Searchable across the whole portfolio',
    ],
  },
  {
    badge: '08 · Security + GDPR',
    title: 'Compliance you can self-serve',
    body:
      'TOTP 2FA with recovery codes, IP rate limiting and lockout, login activity log on /portal/security. Full GDPR Article 17 self-serve data export and account deletion — 30-day grace, then auto-anonymisation by cron.',
    highlights: [
      'Standard authenticator-app TOTP (Google Authenticator, 1Password)',
      '10 single-use recovery codes, regeneratable',
      'See every login attempt against your account',
      'One-click "Download my data" returns a full JSON export',
    ],
  },
]

export default function TourPage() {
  return (
    <div className="bg-obsidian pt-[120px] pb-24">
      <div className="max-w-6xl mx-auto px-8 text-center mb-16">
        <SectionLabel className="mb-4">Tour</SectionLabel>
        <h1 className="font-serif text-5xl md:text-6xl font-light text-ivory mb-6">
          See inside the portal<br />
          <span className="text-gold">before you register</span>
        </h1>
        <p className="font-sans text-base font-light text-stone max-w-2xl mx-auto leading-relaxed">
          Most sourcers just email you PDFs. We give you a portal that tracks every step from your first
          response through to the keys in your hand — and beyond, into your portfolio.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-8 space-y-16">
        {TOUR.map((stop, i) => (
          <article
            key={stop.badge}
            className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? 'md:[&>div:first-child]:order-2' : ''}`}
          >
            {stop.imageSrc && stop.imageAlt ? (
              <div className="relative border border-carbon bg-charcoal aspect-[4/3] overflow-hidden rounded-sm ring-1 ring-carbon">
                <Image
                  src={stop.imageSrc}
                  alt={stop.imageAlt}
                  fill
                  priority={i < 2}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="border border-carbon bg-charcoal aspect-[4/3] flex items-center justify-center relative">
                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(201,168,76,0.08) 0%, transparent 70%)',
                  }}
                />
                <div className="relative z-10 text-center">
                  <p className="font-sans text-[0.55rem] uppercase tracking-widest text-gold mb-4">
                    {stop.badge}
                  </p>
                  <p className="font-serif text-3xl font-light text-ivory leading-snug max-w-[280px] mx-auto">
                    {stop.title}
                  </p>
                  <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone/40 mt-6">
                    Portal screenshot
                  </p>
                </div>
              </div>
            )}

            <div>
              <p className="font-sans text-[0.55rem] uppercase tracking-widest text-gold mb-3">
                {stop.badge}
              </p>
              <h2 className="font-serif text-3xl font-light text-ivory leading-snug mb-5">
                {stop.title}
              </h2>
              <p className="font-sans text-sm font-light text-stone leading-relaxed mb-6">
                {stop.body}
              </p>
              <ul className="space-y-3">
                {stop.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-3">
                    <span className="text-gold mt-1">✓</span>
                    <span className="font-sans text-sm text-ivory">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      <section className="mt-24 py-16 px-8 bg-[#0e0e0e] border-y border-gold/10 text-center">
        <h2 className="font-serif text-4xl font-light text-ivory mb-4">
          Ready to get in?
        </h2>
        <p className="font-sans text-sm font-light text-stone max-w-xl mx-auto mb-8">
          Free to register. KYC in a few minutes. First matched deals usually within a few business days.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button href="/onboarding">Register Free</Button>
          <Button href="/pricing" variant="secondary">View Pricing</Button>
        </div>
        <p className="font-sans text-xs text-stone mt-6">
          Already an investor?{' '}
          <Link href="/login" className="text-gold hover:underline">Sign in →</Link>
        </p>
      </section>
    </div>
  )
}
