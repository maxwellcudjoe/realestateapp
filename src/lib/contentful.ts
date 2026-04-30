import { createClient } from 'contentful'
import type { Deal } from '@/types/deal'

const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID!,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN!,
})

function normalizeDeal(item: any): Deal {
  const f = item.fields
  return {
    id: item.sys.id,
    title: f.title,
    location: f.location,
    strategy: f.strategy,
    marketValue: f.marketValue,
    purchasePrice: f.purchasePrice,
    grossYield: f.grossYield,
    bmvPercent: f.bmvPercent,
    sourcingFee: f.sourcingFee,
    imageUrl: f.image?.fields?.file?.url
      ? `https:${f.image.fields.file.url}`
      : null,
    featured: f.featured ?? false,
    slug: f.slug,
  }
}

export async function getDeals(strategy?: string): Promise<Deal[]> {
  const query: Record<string, unknown> = {
    content_type: 'deal',
    order: '-sys.createdAt',
  }
  if (strategy && strategy !== 'All') {
    query['fields.strategy'] = strategy
  }
  const response = await client.getEntries(query)
  return response.items.map(normalizeDeal)
}

export async function getFeaturedDeal(): Promise<Deal | null> {
  const response = await client.getEntries({
    content_type: 'deal',
    'fields.featured': true,
    limit: 1,
  })
  return response.items[0] ? normalizeDeal(response.items[0]) : null
}
