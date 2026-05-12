import { Suspense } from 'react'
import { getDeals } from '@/lib/contentful'
import { FilterBar } from '@/components/deals/FilterBar'
import { DealGrid } from '@/components/deals/DealGrid'
import { Button } from '@/components/ui/Button'
import { SectionLabel } from '@/components/ui/SectionLabel'
import type { Deal } from '@/types/deal'

export const revalidate = 60

export default async function DealsPage({
  searchParams,
}: {
  searchParams: { strategy?: string }
}) {
  const strategy = searchParams.strategy
  let deals: Deal[] = []
  try {
    deals = await getDeals(strategy)
  } catch {
    deals = []
  }

  return (
    <div className="min-h-screen bg-obsidian pt-[72px]">
      {/* Register banner */}
      <div className="bg-[#231b0d] border-b border-gold/10 px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-sans text-sm font-light text-stone">
          Register to receive <span className="text-gold">deals direct to your inbox</span>
        </p>
        <Button href="/register" className="text-[0.6rem] px-5 py-2">
          Register →
        </Button>
      </div>

      {/* Header */}
      <div className="px-8 py-16 text-center border-b border-carbon">
        <SectionLabel className="mb-4">Available Now</SectionLabel>
        <h1 className="font-serif text-5xl font-light text-ivory">Current Deals</h1>
      </div>

      {/* Filter */}
      <Suspense>
        <FilterBar />
      </Suspense>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <DealGrid deals={deals} />
      </div>
    </div>
  )
}
