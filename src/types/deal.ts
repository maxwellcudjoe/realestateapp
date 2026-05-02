export interface Deal {
  id: string
  title: string
  location: string
  strategy: 'BTL' | 'HMO' | 'Flip'
  marketValue: number
  purchasePrice: number
  grossYield: number
  bmvPercentage: number
  sourcingFee: number
  imageUrl: string | null
  galleryUrls: string[]
  featured: boolean
  slug: string
}
