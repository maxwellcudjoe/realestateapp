import { createClient, type ContentfulClientApi } from 'contentful'
import type { Document } from '@contentful/rich-text-types'

export type InsightCategory = 'Strategy' | 'Compliance' | 'Tax' | 'Market' | 'Process'

export const INSIGHT_CATEGORIES: InsightCategory[] = [
  'Strategy',
  'Compliance',
  'Tax',
  'Market',
  'Process',
]

export interface Insight {
  id: string
  title: string
  slug: string
  summary: string
  body: Document | null
  heroImageUrl: string | null
  category: InsightCategory
  publishedAt: string
  readingMinutes: number
  author: string
  featured: boolean
}

let cachedClient: ContentfulClientApi<undefined> | null = null

function getClient(): ContentfulClientApi<undefined> | null {
  if (cachedClient) return cachedClient
  const space = process.env.CONTENTFUL_SPACE_ID
  const accessToken = process.env.CONTENTFUL_ACCESS_TOKEN
  if (!space || !accessToken) return null
  cachedClient = createClient({ space, accessToken })
  return cachedClient
}

function normalizeInsight(item: any): Insight | null {
  const f = item?.fields
  if (!f) return null
  const category = (f.category ?? 'Strategy') as InsightCategory
  return {
    id: item.sys.id,
    title: String(f.title ?? ''),
    slug: String(f.slug ?? ''),
    summary: String(f.summary ?? ''),
    body: (f.body ?? null) as Document | null,
    heroImageUrl: f.heroImage?.fields?.file?.url
      ? `https:${f.heroImage.fields.file.url}`
      : null,
    category: INSIGHT_CATEGORIES.includes(category) ? category : 'Strategy',
    publishedAt: f.publishedAt
      ? new Date(f.publishedAt).toISOString()
      : item.sys?.createdAt
        ? new Date(item.sys.createdAt).toISOString()
        : new Date(0).toISOString(),
    readingMinutes: Number.isFinite(Number(f.readingMinutes))
      ? Math.max(1, Math.min(60, Number(f.readingMinutes)))
      : 5,
    author: String(f.author ?? 'Rêve Bâtir'),
    featured: Boolean(f.featured),
  }
}

export interface GetInsightsOpts {
  featured?: boolean
  category?: InsightCategory
  limit?: number
}

export async function getInsights(opts: GetInsightsOpts = {}): Promise<Insight[]> {
  const client = getClient()
  if (!client) return []
  try {
    const query: Record<string, unknown> = {
      content_type: 'insight',
      order: '-fields.publishedAt',
    }
    if (opts.featured !== undefined) query['fields.featured'] = opts.featured
    if (opts.category) query['fields.category'] = opts.category
    if (opts.limit) query['limit'] = opts.limit
    const response = await client.getEntries(query)
    return response.items
      .map(normalizeInsight)
      .filter((i): i is Insight => i !== null && i.slug.length > 0)
  } catch {
    return []
  }
}

export async function getInsight(slug: string): Promise<Insight | null> {
  if (!slug) return null
  const client = getClient()
  if (!client) return null
  try {
    const query: Record<string, unknown> = {
      content_type: 'insight',
      'fields.slug': slug,
      limit: 1,
    }
    const response = await client.getEntries(query)
    const first = response.items[0]
    return first ? normalizeInsight(first) : null
  } catch {
    return null
  }
}

export async function getRelatedInsights(
  excludeSlug: string,
  category: InsightCategory,
  limit = 3,
): Promise<Insight[]> {
  const client = getClient()
  if (!client) return []
  try {
    const query: Record<string, unknown> = {
      content_type: 'insight',
      'fields.category': category,
      'fields.slug[ne]': excludeSlug,
      order: '-fields.publishedAt',
      limit,
    }
    const response = await client.getEntries(query)
    return response.items
      .map(normalizeInsight)
      .filter((i): i is Insight => i !== null && i.slug.length > 0 && i.slug !== excludeSlug)
  } catch {
    return []
  }
}

export function formatPublishedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}
