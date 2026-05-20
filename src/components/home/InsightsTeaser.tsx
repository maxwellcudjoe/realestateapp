import Link from 'next/link'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { getInsights, formatPublishedDate, type Insight } from '@/lib/insights'

export async function InsightsTeaser() {
  const featured = await getInsights({ featured: true, limit: 3 })
  if (featured.length < 3) {
    const recent = await getInsights({ limit: 3 })
    const seen = new Set(featured.map((i) => i.id))
    for (const i of recent) {
      if (featured.length >= 3) break
      if (!seen.has(i.id)) {
        featured.push(i)
        seen.add(i.id)
      }
    }
  }

  if (featured.length === 0) return null

  return (
    <section className="bg-obsidian py-24 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel className="mb-4">Insights</SectionLabel>
          <h2 className="font-serif text-4xl font-light text-ivory">
            Recent thinking from the platform
          </h2>
          <p className="font-sans text-sm font-light text-stone mt-4 max-w-2xl mx-auto">
            Plain-English guides on strategy, compliance, tax, and the UK property market — for investors
            who want to know before they commit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-carbon">
          {featured.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/insights"
            className="font-sans text-xs font-semibold uppercase tracking-widest text-gold hover:text-ivory transition-colors"
          >
            Browse all insights →
          </Link>
        </div>
      </div>
    </section>
  )
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <Link
      href={`/insights/${insight.slug}`}
      className="bg-charcoal p-8 flex flex-col gap-4 hover:bg-[#15151a] transition-colors group"
    >
      <div className="flex items-center gap-3 text-[0.6rem] uppercase tracking-widest text-gold">
        <span>{insight.category}</span>
        <span className="text-carbon">·</span>
        <span className="text-stone">{insight.readingMinutes} min read</span>
      </div>
      <h3 className="font-serif text-xl font-light text-ivory group-hover:text-gold transition-colors">
        {insight.title}
      </h3>
      <p className="font-sans text-sm text-stone leading-relaxed flex-1">{insight.summary}</p>
      <p className="font-sans text-xs text-carbon mt-2">{formatPublishedDate(insight.publishedAt)}</p>
    </Link>
  )
}
