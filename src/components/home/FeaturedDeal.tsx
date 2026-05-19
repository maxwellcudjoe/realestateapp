import Image from 'next/image'
import Link from 'next/link'
import type { Deal } from '@/types/deal'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Button } from '@/components/ui/Button'
import { PREMIUM_PREVIEW_HOURS } from '@/lib/subscriptions'

export async function FeaturedDeal({ deal }: { deal: Deal | null }) {
  if (!deal) return null

  const bmv = Math.round(deal.bmvPercentage)
  const saving = deal.marketValue - deal.purchasePrice

  // Auth-aware CTA wiring
  let isAuthed = false
  let userTier: 'FREE' | 'PREMIUM' = 'FREE'
  let extraDealCount = 0
  try {
    const session = await auth()
    if (session?.user?.id) {
      isAuthed = true
      const u = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { tier: true },
      })
      userTier = (u?.tier as 'FREE' | 'PREMIUM') ?? 'FREE'
    }

    // Live count of deals in the portal (separate from the Contentful featured deal)
    extraDealCount = await prisma.deal.count({
      where: { status: 'OPEN', publishedAt: { not: null } },
    })
  } catch {
    // Non-fatal — homepage stays renderable
  }

  const ctaLabel = isAuthed ? 'View Full Pack' : 'Register to View Pack'
  const ctaHref = isAuthed ? '/portal/deals' : '/onboarding'

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
            {userTier !== 'PREMIUM' && (
              <div className="absolute bottom-3 left-3 bg-obsidian/80 border border-gold/40 text-gold font-sans text-[0.55rem] uppercase tracking-widest px-2 py-1">
                Premium sees this {PREMIUM_PREVIEW_HOURS}h early
              </div>
            )}
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

            <Button href={ctaHref} fullWidth>{ctaLabel}</Button>
          </div>
        </div>

        {/* Editorial copy */}
        <div>
          <SectionLabel className="mb-5">Featured Deal</SectionLabel>
          <h2 className="font-serif text-4xl font-light text-ivory leading-snug mb-6">
            Current Opportunities<br />For Serious Investors
          </h2>
          <p className="font-sans text-sm font-light text-stone leading-relaxed mb-6">
            Every deal we source is independently verified against market comparables, packaged with a full due-diligence report, and made available exclusively to registered investors. No auctions, no inflated prices.
          </p>
          {extraDealCount > 0 && (
            <p className="font-sans text-xs uppercase tracking-widest text-gold mb-6">
              + {extraDealCount} more {extraDealCount === 1 ? 'deal' : 'deals'} live in the portal
            </p>
          )}
          <Link
            href={isAuthed ? '/portal/deals' : '/deals'}
            className="font-sans text-xs font-semibold uppercase tracking-widest text-gold border-b border-gold/30 pb-0.5 hover:border-gold transition-colors"
          >
            {isAuthed ? 'View All Deals in Portal →' : 'Browse Public Deals →'}
          </Link>
        </div>
      </div>
    </section>
  )
}
