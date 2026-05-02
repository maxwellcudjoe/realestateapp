import { createClient, type ContentfulClientApi } from 'contentful'
import type { Deal } from '@/types/deal'

let cachedClient: ContentfulClientApi<undefined> | null = null

function getClient(): ContentfulClientApi<undefined> | null {
  if (cachedClient) return cachedClient
  const space = process.env.CONTENTFUL_SPACE_ID
  const accessToken = process.env.CONTENTFUL_ACCESS_TOKEN
  if (!space || !accessToken) return null
  cachedClient = createClient({ space, accessToken })
  return cachedClient
}

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
    bmvPercentage: f.bmvPercentage,
    sourcingFee: f.sourcingFee,
    imageUrl: f.image?.fields?.file?.url
      ? `https:${f.image.fields.file.url}`
      : null,
    featured: f.featured ?? false,
    slug: f.slug,
  }
}

export async function getDeals(strategy?: string): Promise<Deal[]> {
  const client = getClient()
  if (!client) return []

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
  const client = getClient()
  if (!client) return null

  const response = await client.getEntries({
    content_type: 'deal',
    'fields.featured': true,
    limit: 1,
  })
  return response.items[0] ? normalizeDeal(response.items[0]) : null
}
