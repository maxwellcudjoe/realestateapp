'use client'

import { useRouter } from 'next/navigation'
import { DealCard, DealData } from './DealCard'

interface Props {
  deals: DealData[]
}

export function DealsClient({ deals }: Props) {
  const router = useRouter()

  if (deals.length === 0) {
    return (
      <p className="font-sans text-sm text-stone">
        No deals have been posted to your profile yet. We&apos;ll notify you by email when one is ready.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} onMutated={() => router.refresh()} />
      ))}
    </div>
  )
}
