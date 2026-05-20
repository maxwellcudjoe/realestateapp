import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Button } from '@/components/ui/Button'
import { PricingBlock } from '@/components/home/PricingBlock'
import {
  getAllLandingPages,
  getLandingPage,
  isValidStrategySlug,
  isValidCitySlug,
  type LandingPage,
} from '@/lib/landing-pages'
import { getAreaStats, meaningfulCount, type AreaStats } from '@/lib/area-stats'
import {
  getAreaLandingContent,
  buildFallbackContent,
  type AreaLandingContent,
} from '@/lib/area-landing-content'
import { formatTrustNumber, formatTrustGbp } from '@/lib/homepage-metrics'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ strategy: string; city: string }>
}

export async function generateStaticParams() {
  return getAllLandingPages().map((p) => ({
    strategy: p.strategySlug,
    city: p.citySlug,
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { strategy, city } = await params
  const page = getLandingPage(strategy, city)
  if (!page) return { title: 'Not found' }
  const title = `${page.strategyLabel} deals in ${page.cityShort}`
  const description = `Verified ${page.strategyLabel.toLowerCase()} property opportunities in ${page.cityShort}. Independent BMV verification, full due-diligence packs, end-to-end pipeline tracking — from Rêve Bâtir.`
  return {
    title,
    description,
    alternates: { canonical: `/${page.strategySlug}/${page.citySlug}` },
    openGraph: {
      title: `${title} · Rêve Bâtir`,
      description,
      url: `/${page.strategySlug}/${page.citySlug}`,
      type: 'website',
      images: [
        {
          url: '/og/insights.png',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} · Rêve Bâtir`,
      description,
      images: ['/og/insights.png'],
    },
  }
}

export default async function LandingPagePage({ params }: PageProps) {
  const { strategy, city } = await params
  if (!isValidStrategySlug(strategy) || !isValidCitySlug(city)) notFound()
  const page = getLandingPage(strategy, city)
  if (!page) notFound()

  const [stats, contentFromCms] = await Promise.all([
    getAreaStats(page.citySlug, page.cityShort, page.strategyCode),
    getAreaLandingContent(page.contentfulSlug),
  ])
  const content = contentFromCms ?? buildFallbackContent(page.strategyLabel, page.cityShort)

  const breadcrumbJsonLd = buildBreadcrumbJsonLd(page)
  const placeJsonLd = buildPlaceJsonLd(page)

  return (
    <main className="bg-obsidian pt-32 pb-24 px-8 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }}
      />

      <div className="max-w-7xl mx-auto">
        <Breadcrumbs page={page} />
        <Hero page={page} />
        <StatsStrip stats={stats} />
        <WhyHere page={page} content={content} />
        <IntroCopy content={content} />
        <PricingBlock />
        <ClosingCta page={page} />
      </div>
    </main>
  )
}

function Breadcrumbs({ page }: { page: LandingPage }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-8">
      <ol className="flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-widest text-stone">
        <li>
          <Link href="/" className="hover:text-ivory">Home</Link>
        </li>
        <li aria-hidden="true">›</li>
        <li>
          <Link href="/insights" className="hover:text-ivory">Insights</Link>
        </li>
        <li aria-hidden="true">›</li>
        <li className="text-ivory">
          {page.strategyLabel} in {page.cityShort}
        </li>
      </ol>
    </nav>
  )
}

function Hero({ page }: { page: LandingPage }) {
  return (
    <header className="mb-16">
      <SectionLabel className="mb-4">
        {page.strategyLabel} · {page.cityShort}
      </SectionLabel>
      <h1 className="font-serif text-5xl md:text-6xl font-light text-ivory leading-tight mb-6">
        {page.strategyLabel} deals in <span className="text-gold">{page.cityShort}</span>
      </h1>
      <p className="font-sans text-base font-light text-stone max-w-2xl leading-relaxed mb-8">
        Verified below-market-value opportunities, independent BMV checks, full due-diligence packs,
        end-to-end pipeline tracking — from offer to keys.
      </p>
      <div className="flex flex-wrap gap-4">
        <Button href={`/deals?strategy=${page.strategyCode}`}>
          Browse current {page.strategyLabel.toLowerCase()} deals
        </Button>
        <Button
          href={`/register?strategy=${page.strategyCode}&area=${page.citySlug}`}
          variant="secondary"
        >
          Get matched alerts
        </Button>
      </div>
    </header>
  )
}

function StatsStrip({ stats }: { stats: AreaStats }) {
  const entries: Array<{ value: string; label: string }> = []
  const deals = meaningfulCount(stats.dealsLast12Months)
  const completed = meaningfulCount(stats.completedLast12Months)
  const investors = meaningfulCount(stats.activeInvestorsTargetingArea)

  if (deals !== null) {
    entries.push({ value: formatTrustNumber(deals), label: 'Deals last 12 months' })
  }
  if (completed !== null) {
    entries.push({
      value: formatTrustGbp(stats.totalCompletedValue),
      label: 'Completed value (12 months)',
    })
  }
  if (investors !== null) {
    entries.push({ value: formatTrustNumber(investors), label: 'Investors targeting area' })
  }

  if (entries.length === 0) return null

  return (
    <section className="my-16">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-carbon">
        {entries.map((e) => (
          <div key={e.label} className="bg-[#0e0e0e] p-8 text-center">
            <p className="font-serif text-4xl text-gold leading-none mb-2">{e.value}</p>
            <p className="font-sans text-[0.6rem] uppercase tracking-widest text-stone leading-relaxed">
              {e.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function WhyHere({ page, content }: { page: LandingPage; content: AreaLandingContent }) {
  if (content.whyHereBullets.length === 0) return null
  return (
    <section className="my-16">
      <SectionLabel className="mb-4">Why {page.cityShort}</SectionLabel>
      <h2 className="font-serif text-3xl font-light text-ivory mb-10">
        Why {page.cityShort} for {page.strategyLabel.toLowerCase()}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-carbon">
        {content.whyHereBullets.map((bullet) => (
          <div key={bullet} className="bg-charcoal p-6 flex items-start gap-3">
            <span className="text-gold mt-1 flex-shrink-0">✓</span>
            <p className="font-sans text-sm text-ivory leading-relaxed">{bullet}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function IntroCopy({ content }: { content: AreaLandingContent }) {
  return (
    <section className="my-16 max-w-3xl">
      {content.heroImageUrl && (
        <div className="relative aspect-[16/9] mb-8 overflow-hidden bg-charcoal">
          <Image
            src={content.heroImageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 768px, 100vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="font-sans text-base text-ivory/90 leading-relaxed space-y-6">
        {content.introCopy.split(/\n\n+/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      {content.localComparables && (
        <aside className="mt-10 p-6 border border-carbon">
          <SectionLabel className="mb-3">Local comparables</SectionLabel>
          <p className="font-sans text-sm text-stone leading-relaxed">{content.localComparables}</p>
        </aside>
      )}
    </section>
  )
}

function ClosingCta({ page }: { page: LandingPage }) {
  return (
    <section className="my-16 py-16 px-8 bg-[#0e0e0e] border-y border-gold/10 text-center">
      <h2 className="font-serif text-4xl font-light text-ivory mb-4">
        Set {page.cityShort} as a target area
      </h2>
      <p className="font-sans text-sm font-light text-stone max-w-xl mx-auto mb-8">
        Register free and add {page.cityShort} + {page.strategyLabel.toLowerCase()} to your investor
        profile. Matched deals land in your portal as we source them.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button href={`/register?strategy=${page.strategyCode}&area=${page.citySlug}`}>
          Register Free
        </Button>
        <Button href="/pricing" variant="secondary">View Premium</Button>
      </div>
    </section>
  )
}

function buildBreadcrumbJsonLd(page: LandingPage) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.revebatir.co.uk/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Insights',
        item: 'https://www.revebatir.co.uk/insights',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${page.strategyLabel} in ${page.cityShort}`,
        item: `https://www.revebatir.co.uk/${page.strategySlug}/${page.citySlug}`,
      },
    ],
  }
}

function buildPlaceJsonLd(page: LandingPage) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: page.cityShort,
    address: { '@type': 'PostalAddress', addressLocality: page.cityShort, addressCountry: 'GB' },
  }
}
