import { createClient, type ContentfulClientApi } from 'contentful'

export interface Testimonial {
  id: string
  quote: string
  name: string
  role: string
  photoUrl: string | null
  consentDate: string
  featured: boolean
  displayOrder: number
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

function normalizeTestimonial(item: any): Testimonial | null {
  const f = item?.fields
  if (!f) return null

  if (f.consentRecorded !== true) return null

  const quote = String(f.quote ?? '').trim()
  const name = String(f.name ?? '').trim()
  const role = String(f.role ?? '').trim()
  if (!quote || !name || !role) return null

  return {
    id: item.sys.id,
    quote,
    name,
    role,
    photoUrl: f.photo?.fields?.file?.url ? `https:${f.photo.fields.file.url}` : null,
    consentDate: f.consentDate
      ? new Date(f.consentDate).toISOString()
      : new Date(0).toISOString(),
    featured: Boolean(f.featured),
    displayOrder: Number.isFinite(Number(f.displayOrder)) ? Number(f.displayOrder) : 999,
  }
}

export interface GetTestimonialsOpts {
  featured?: boolean
  limit?: number
}

export async function getTestimonials(opts: GetTestimonialsOpts = {}): Promise<Testimonial[]> {
  const client = getClient()
  if (!client) return []
  try {
    const query: Record<string, unknown> = {
      content_type: 'testimonial',
      order: 'fields.displayOrder',
    }
    if (opts.featured !== undefined) query['fields.featured'] = opts.featured
    if (opts.limit) query['limit'] = opts.limit
    const response = await client.getEntries(query)
    return response.items
      .map(normalizeTestimonial)
      .filter((t): t is Testimonial => t !== null)
  } catch {
    return []
  }
}

export function getInitialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}
