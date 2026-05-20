import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { documentToReactComponents } from '@contentful/rich-text-react-renderer'
import { BLOCKS, INLINES, type Block, type Inline } from '@contentful/rich-text-types'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Button } from '@/components/ui/Button'
import {
  getInsight,
  getInsights,
  getRelatedInsights,
  formatPublishedDate,
  type Insight,
} from '@/lib/insights'

export const revalidate = 600

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const all = await getInsights()
  return all.map((i) => ({ slug: i.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const insight = await getInsight(slug)
  if (!insight) {
    return { title: 'Insight not found' }
  }
  return {
    title: insight.title,
    description: insight.summary,
    alternates: { canonical: `/insights/${insight.slug}` },
    openGraph: {
      title: insight.title,
      description: insight.summary,
      url: `/insights/${insight.slug}`,
      type: 'article',
      publishedTime: insight.publishedAt,
      authors: [insight.author],
      images: insight.heroImageUrl
        ? [{ url: insight.heroImageUrl, alt: insight.title }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: insight.title,
      description: insight.summary,
      images: insight.heroImageUrl ? [insight.heroImageUrl] : undefined,
    },
  }
}

export default async function InsightArticlePage({ params }: PageProps) {
  const { slug } = await params
  const insight = await getInsight(slug)
  if (!insight) notFound()

  const related = await getRelatedInsights(insight.slug, insight.category, 3)
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: insight.title,
    description: insight.summary,
    datePublished: insight.publishedAt,
    author: { '@type': 'Organization', name: insight.author },
    publisher: {
      '@type': 'Organization',
      name: 'Rêve Bâtir',
      url: 'https://www.revebatir.co.uk',
    },
    image: insight.heroImageUrl ?? undefined,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.revebatir.co.uk/insights/${insight.slug}`,
    },
  }

  return (
    <main className="bg-obsidian pt-32 pb-24 px-8 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article className="max-w-3xl mx-auto">
        <Link
          href="/insights"
          className="inline-block font-sans text-xs uppercase tracking-widest text-stone hover:text-gold transition-colors mb-8"
        >
          ← All insights
        </Link>

        <header className="mb-12">
          <div className="flex items-center gap-3 text-[0.65rem] uppercase tracking-widest text-gold mb-6">
            <span>{insight.category}</span>
            <span className="text-carbon">·</span>
            <span className="text-stone">{insight.readingMinutes} min read</span>
            <span className="text-carbon">·</span>
            <span className="text-stone">{formatPublishedDate(insight.publishedAt)}</span>
          </div>
          <h1 className="font-serif text-5xl font-light text-ivory leading-tight mb-6">
            {insight.title}
          </h1>
          <p className="font-sans text-lg font-light text-stone leading-relaxed">{insight.summary}</p>
          <p className="font-sans text-xs uppercase tracking-widest text-carbon mt-6">
            By {insight.author}
          </p>
        </header>

        {insight.heroImageUrl && (
          <div className="relative aspect-[16/9] mb-12 overflow-hidden bg-charcoal">
            <Image
              src={insight.heroImageUrl}
              alt={insight.title}
              fill
              priority
              sizes="(min-width: 1024px) 768px, 100vw"
              className="object-cover"
            />
          </div>
        )}

        <div className="prose-insight">
          {insight.body ? (
            documentToReactComponents(insight.body, richTextRenderers)
          ) : (
            <p className="font-sans text-stone">Article content is being prepared.</p>
          )}
        </div>

        <aside className="mt-16 pt-12 border-t border-carbon">
          <p className="font-sans text-sm text-stone leading-relaxed">
            Want deals delivered as we source them? Register free in three minutes — Premium investors get
            a 48-hour head start on every new pack.
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            <Button href="/register">Register Free</Button>
            <Button href="/pricing" variant="secondary">View Pricing</Button>
          </div>
        </aside>
      </article>

      {related.length > 0 && (
        <section className="max-w-7xl mx-auto mt-24">
          <SectionLabel className="mb-4 text-center">Related</SectionLabel>
          <h2 className="font-serif text-3xl font-light text-ivory text-center mb-12">
            More on {insight.category.toLowerCase()}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-carbon">
            {related.map((r) => (
              <RelatedCard key={r.id} insight={r} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

function RelatedCard({ insight }: { insight: Insight }) {
  return (
    <Link
      href={`/insights/${insight.slug}`}
      className="bg-charcoal p-6 flex flex-col gap-3 hover:bg-[#15151a] transition-colors group"
    >
      <div className="flex items-center gap-3 text-[0.6rem] uppercase tracking-widest text-gold">
        <span>{insight.category}</span>
        <span className="text-carbon">·</span>
        <span className="text-stone">{insight.readingMinutes} min</span>
      </div>
      <h3 className="font-serif text-lg font-light text-ivory group-hover:text-gold transition-colors">
        {insight.title}
      </h3>
      <p className="font-sans text-sm text-stone leading-relaxed flex-1">{insight.summary}</p>
    </Link>
  )
}

const richTextRenderers = {
  renderNode: {
    [BLOCKS.HEADING_2]: (_n: Block | Inline, children: React.ReactNode) => (
      <h2 className="font-serif text-3xl font-light text-ivory mt-12 mb-4">{children}</h2>
    ),
    [BLOCKS.HEADING_3]: (_n: Block | Inline, children: React.ReactNode) => (
      <h3 className="font-serif text-2xl font-light text-ivory mt-10 mb-3">{children}</h3>
    ),
    [BLOCKS.PARAGRAPH]: (_n: Block | Inline, children: React.ReactNode) => (
      <p className="font-sans text-base text-ivory/90 leading-relaxed mb-6">{children}</p>
    ),
    [BLOCKS.UL_LIST]: (_n: Block | Inline, children: React.ReactNode) => (
      <ul className="list-disc list-inside font-sans text-base text-ivory/90 leading-relaxed mb-6 space-y-2">
        {children}
      </ul>
    ),
    [BLOCKS.OL_LIST]: (_n: Block | Inline, children: React.ReactNode) => (
      <ol className="list-decimal list-inside font-sans text-base text-ivory/90 leading-relaxed mb-6 space-y-2">
        {children}
      </ol>
    ),
    [BLOCKS.QUOTE]: (_n: Block | Inline, children: React.ReactNode) => (
      <blockquote className="border-l-2 border-gold pl-6 my-8 font-serif text-xl italic text-stone leading-relaxed">
        {children}
      </blockquote>
    ),
    [INLINES.HYPERLINK]: (node: Block | Inline, children: React.ReactNode) => (
      <a
        href={(node.data as { uri: string }).uri}
        className="text-gold underline underline-offset-4 hover:text-ivory"
        rel="noreferrer"
        target={(node.data as { uri: string }).uri.startsWith('http') ? '_blank' : undefined}
      >
        {children}
      </a>
    ),
  },
}
