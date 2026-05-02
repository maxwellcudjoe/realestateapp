import Image from 'next/image'
import Link from 'next/link'
import type { Deal } from '@/types/deal'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Button } from '@/components/ui/Button'

export function FeaturedDeal({ deal }: { deal: Deal | null }) {
  if (!deal) return null

  const bmv = Math.round(deal.bmvPercentage)
  const saving = deal.marketValue - deal.purchasePrice

  return (
    <section className="bg-obsidian py-24 px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* Deal card */}
        <div className="bg-charcoal border border-carbon overflow-hidden">
          <div className="relative h-56 bg-[#1a1a1a]">
            {deal.imageUrl ? (
              <Image
                src={deal.imageUrl}
                alt={deal.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center font-sans text-xs uppercase tracking-widest text-[#333]">
                Property Photo
              </div>
            )}
            <div className="absolute top-3 right-3 bg-gold text-obsidian font-sans text-xs font-bold px-3 py-1">
              {bmv}% BMV
            </div>
          </div>

          <div className="p-6">
            <p className="font-sans text-[0.6rem] font-semibold uppercase tracking-widest text-gold mb-1">
              {deal.location}
            </p>
            <p className="font-serif text-xl text-ivory mb-4">
              {deal.title} · {deal.strategy}
            </p>

            <div className="grid grid-cols-2 gap-4 py-4 border-t border-carbon mb-4">
              {[
                { label: 'Market Value',    value: `£${deal.marketValue.toLocaleString()}`,    gold: false },
                { label: 'Purchase Price',  value: `£${deal.purchasePrice.toLocaleString()}`,  gold: true  },
                { label: 'Gross Yield',     value: `${deal.grossYield}%`,                      gold: true  },
                { label: 'Saving',          value: `£${saving.toLocaleString()}`,              gold: true  },
              ].map(({ label, value, gold }) => (
                <div key={label}>
                  <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">{label}</p>
                  <p className={`font-serif text-xl ${gold ? 'text-gold' : 'text-ivory'}`}>{value}</p>
                </div>
              ))}
            </div>

            <Button href="/contact" fullWidth>Request Full Pack</Button>
          </div>
        </div>

        {/* Editorial copy */}
        <div>
          <SectionLabel className="mb-5">Featured Deal</SectionLabel>
          <h2 className="font-serif text-4xl font-light text-ivory leading-snug mb-6">
            Current Opportunities<br />For Serious Investors
          </h2>
          <p className="font-sans text-sm font-light text-stone leading-relaxed mb-8">
            Every deal we source is independently verified against market comparables, packaged with a full due diligence report, and made available exclusively to registered buyers. No auctions, no inflated prices.
          </p>
          <Link
            href="/deals"
            className="font-sans text-xs font-semibold uppercase tracking-widest text-gold border-b border-gold/30 pb-0.5 hover:border-gold transition-colors"
          >
            View All Deals →
          </Link>
        </div>
      </div>
    </section>
  )
}
