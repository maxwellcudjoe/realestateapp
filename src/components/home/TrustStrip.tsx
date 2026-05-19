import { getHomepageMetrics, formatTrustNumber, formatTrustGbp } from '@/lib/homepage-metrics'

const REGISTRY_LINKS = [
  { label: 'HMRC MLR Registered', href: 'https://www.gov.uk/anti-money-laundering-registration' },
  { label: 'ICO Registered Data Controller', href: 'https://ico.org.uk/ESDWebPages/Search' },
  { label: 'Companies House #17201842', href: 'https://find-and-update.company-information.service.gov.uk/' },
]

export async function TrustStrip() {
  const metrics = await getHomepageMetrics()

  const stats = [
    { label: 'Deals sourced YTD', value: formatTrustNumber(metrics.totalDealsYtd) },
    { label: 'Verified investors', value: formatTrustNumber(metrics.totalActiveInvestors) },
    { label: 'Total transactions', value: formatTrustGbp(metrics.totalCompletedValue) },
    { label: 'Completed deals', value: formatTrustNumber(metrics.totalCompletedCount) },
  ]

  return (
    <section className="bg-[#0c0c0c] border-y border-carbon py-10 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-serif text-3xl md:text-4xl text-gold leading-none mb-2">{s.value}</p>
              <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-6 border-t border-carbon">
          {REGISTRY_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-[0.55rem] uppercase tracking-widest text-stone hover:text-gold transition-colors border border-carbon px-3 py-1.5"
            >
              ✓ {label}
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
