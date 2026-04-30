import type { Deal } from '@/types/deal'
import { DealCard } from './DealCard'

export function DealGrid({ deals }: { deals: Deal[] }) {
  if (deals.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="font-serif text-2xl font-light text-stone">
          Deals coming soon — register to be notified.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-carbon">
      {deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} />
      ))}
    </div>
  )
}
