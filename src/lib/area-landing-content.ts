import { createClient, type ContentfulClientApi } from 'contentful'

export interface AreaLandingContent {
  introCopy: string
  whyHereBullets: string[]
  localComparables: string | null
  heroImageUrl: string | null
  publishedAt: string
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

export async function getAreaLandingContent(
  contentfulSlug: string,
): Promise<AreaLandingContent | null> {
  const client = getClient()
  if (!client) return null
  try {
    const query: Record<string, unknown> = {
      content_type: 'areaLanding',
      'fields.slug': contentfulSlug,
      limit: 1,
    }
    const response = await client.getEntries(query)
    const item = response.items[0]
    if (!item) return null
    const f = item.fields as Record<string, unknown>
    const intro = String(f.introCopy ?? '').trim()
    const bullets = Array.isArray(f.whyHereBullets)
      ? (f.whyHereBullets as unknown[]).map((b) => String(b)).filter(Boolean)
      : []
    return {
      introCopy: intro,
      whyHereBullets: bullets,
      localComparables: f.localComparables ? String(f.localComparables).trim() : null,
      heroImageUrl: (() => {
        const hero = f.heroImage as { fields?: { file?: { url?: string } } } | undefined
        return hero?.fields?.file?.url ? `https:${hero.fields.file.url}` : null
      })(),
      publishedAt: f.publishedAt
        ? new Date(String(f.publishedAt)).toISOString()
        : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

/**
 * Default copy used when no Contentful `areaLanding` entry exists for a
 * (strategy, city) tuple. Keeps every URL renderable — never a 404.
 */
export function buildFallbackContent(
  strategyLabel: string,
  cityShort: string,
): AreaLandingContent {
  return {
    introCopy:
      `${cityShort} is one of the UK's most active markets for ${strategyLabel.toLowerCase()} investment. ` +
      `Rêve Bâtir sources verified below-market-value opportunities here for our investor network, with full ` +
      `due-diligence packs and end-to-end pipeline tracking through to completion. We are HMRC MLR-registered, ` +
      `ICO-registered, and Companies House-listed — every deal in ${cityShort} is processed through the same ` +
      `compliance-first workflow as the rest of the platform.`,
    whyHereBullets: [
      `Active ${strategyLabel.toLowerCase()} sourcing in ${cityShort} every month`,
      `Independent BMV verification on every deal pack`,
      `End-to-end pipeline tracking through to completion`,
      `Premium investors see new ${cityShort} deals 48 hours early`,
    ],
    localComparables: null,
    heroImageUrl: null,
    publishedAt: new Date().toISOString(),
  }
}
