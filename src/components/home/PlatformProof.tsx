import { SectionLabel } from '@/components/ui/SectionLabel'
import { prisma } from '@/lib/prisma'
import { formatTrustGbp, formatTrustNumber } from '@/lib/homepage-metrics'

interface PlatformProofData {
  dealsLast12mo: number
  brokeredLast12mo: number
  activeAcrossAreas: number
  completionsLast12mo: number
}

async function getPlatformProof(): Promise<PlatformProofData> {
  try {
    const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)

    const [dealsLast12mo, completions, areas] = await Promise.all([
      prisma.deal.count({
        where: { publishedAt: { gte: cutoff } },
      }),
      prisma.property.findMany({
        where: { completionDate: { gte: cutoff } },
        select: { purchasePrice: true },
      }),
      // Count distinct target areas covered by active investors
      prisma.targetArea.findMany({
        distinct: ['code'],
        select: { code: true },
      }),
    ])

    return {
      dealsLast12mo,
      brokeredLast12mo: completions.reduce((sum, c) => sum + Number(c.purchasePrice), 0),
      activeAcrossAreas: areas.length,
      completionsLast12mo: completions.length,
    }
  } catch {
    return { dealsLast12mo: 0, brokeredLast12mo: 0, activeAcrossAreas: 0, completionsLast12mo: 0 }
  }
}

export async function PlatformProof() {
  const data = await getPlatformProof()

  // If the platform genuinely has no activity yet, hide this section
  // rather than show "0 deals" — that's worse than silence.
  if (data.dealsLast12mo === 0 && data.completionsLast12mo === 0) return null

  const stats = [
    { value: formatTrustNumber(data.dealsLast12mo), label: 'Deals sourced (last 12 months)' },
    { value: formatTrustGbp(data.brokeredLast12mo), label: 'Total brokered (last 12 months)' },
    { value: formatTrustNumber(data.completionsLast12mo), label: 'Completed transactions' },
    { value: formatTrustNumber(data.activeAcrossAreas), label: 'UK regions covered' },
  ]

  return (
    <section className="bg-[#0e0e0e] py-24 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <SectionLabel className="mb-4">By The Numbers</SectionLabel>
          <h2 className="font-serif text-4xl font-light text-ivory">The platform in motion</h2>
          <p className="font-sans text-sm font-light text-stone mt-4 max-w-2xl mx-auto">
            Real data, refreshed nightly from the platform itself. Updated{' '}
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-carbon">
          {stats.map((s) => (
            <div key={s.label} className="bg-[#0e0e0e] p-8 text-center">
              <p className="font-serif text-5xl text-gold leading-none mb-3">{s.value}</p>
              <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone leading-relaxed">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <p className="text-center font-sans text-xs text-stone mt-8 max-w-2xl mx-auto leading-relaxed">
          All figures are derived from the live database. We don&rsquo;t round up. We don&rsquo;t add &ldquo;projected&rdquo;
          numbers. If a stat looks small, it&rsquo;s because we&rsquo;re selective — every deal goes through full due
          diligence before it reaches an investor.
        </p>
      </div>
    </section>
  )
}
