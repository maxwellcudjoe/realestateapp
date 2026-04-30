export interface Deal {
  id: string
  title: string
  location: string
  strategy: 'BTL' | 'HMO' | 'Flip'
  marketValue: number
  purchasePrice: number
  grossYield: number
  bmvPercent: number
  sourcingFee: number
  imageUrl: string | null
  featured: boolean
  slug: string
}
