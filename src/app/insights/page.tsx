import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { SectionLabel } from '@/components/ui/SectionLabel'
import {
  getInsights,
  formatPublishedDate,
  INSIGHT_CATEGORIES,
  type InsightCategory,
  type Insight,
} from '@/lib/insights'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Insights for UK Property Investors',
  description:
    'Plain-English guides on UK property investment strategy, AML compliance, SDLT, and market dynamics — from the Rêve Bâtir platform.',
  alternates: { canonical: '/insights' },
  openGraph: {
    title: 'Insights for UK Property Investors',
    description:
      'Strategy, compliance, tax, and market thinking from the Rêve Bâtir investor platform.',
    url: '/insights',
    type: 'website',
    images: [
      {
        url: '/og/insights.png',
        width: 1200,
        height: 630,
        alt: 'Rêve Bâtir Insights — guides for UK property investors',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Insights for UK Property Investors',
    description: 'Plain-English guides on strategy, compliance, tax, and the UK property market.',
    images: ['/og/insights.png'],
  },
}

interface PageProps {
  searchParams?: Promise<{ category?: string }>
}

export default async function InsightsIndexPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const requestedCategory = params.category
  const activeCategory: InsightCategory | undefined =
    requestedCategory && (INSIGHT_CATEGORIES as string[]).includes(requestedCategory)
      ? (requestedCategory as InsightCategory)
      : undefined

  const insights = await getInsights({ category: activeCategory })

  return (
    <main className="bg-obsidian pt-32 pb-24 px-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-12">
          <SectionLabel className="mb-4">Insights</SectionLabel>
          <h1 className="font-serif text-5xl font-light text-ivory">
            Insights for UK Property Investors
          </h1>
          <p className="font-sans text-base font-light text-stone mt-6 max-w-2xl mx-auto leading-relaxed">
            Strategy, compliance, tax, and market thinking — written for serious investors. No
            puff-pieces, no affiliate fluff.
          </p>
        </header>

        <nav className="flex flex-wrap items-center justify-center gap-3 mb-16" aria-label="Filter insights by category">
          <CategoryChip href="/insights" active={!activeCategory}>
            All
          </CategoryChip>
          {INSIGHT_CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              href={`/insights?category=${cat}`}
              active={activeCategory === cat}
            >
              {cat}
            </CategoryChip>
          ))}
        </nav>

        {insights.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-carbon">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function CategoryChip({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  const base =
    'inline-block px-5 py-2 text-[0.65rem] font-semibold uppercase tracking-widest border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold'
  const styles = active
    ? 'border-gold text-gold bg-gold/5'
    : 'border-carbon text-stone hover:border-stone hover:text-ivory'
  return (
    <Link href={href} className={`${base} ${styles}`}>
      {children}
    </Link>
  )
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <Link
      href={`/insights/${insight.slug}`}
      className="bg-charcoal flex flex-col hover:bg-[#15151a] transition-colors group"
    >
      {insight.heroImageUrl ? (
        <div className="relative aspect-[16/10] overflow-hidden bg-obsidian">
          <Image
            src={insight.heroImageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="aspect-[16/10] bg-gradient-to-br from-charcoal to-carbon" />
      )}
      <div className="p-6 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-3 text-[0.6rem] uppercase tracking-widest text-gold">
          <span>{insight.category}</span>
          <span className="text-carbon">·</span>
          <span className="text-stone">{insight.readingMinutes} min read</span>
        </div>
        <h2 className="font-serif text-xl font-light text-ivory group-hover:text-gold transition-colors">
          {insight.title}
        </h2>
        <p className="font-sans text-sm text-stone leading-relaxed flex-1">{insight.summary}</p>
        <p className="font-sans text-xs text-carbon mt-2">{formatPublishedDate(insight.publishedAt)}</p>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-24 border border-carbon">
      <p className="font-sans text-sm font-light text-stone max-w-md mx-auto">
        Insights are coming soon. Check back in a few days — we&rsquo;re working on a set of evergreen
        guides for UK property investors.
      </p>
    </div>
  )
}
