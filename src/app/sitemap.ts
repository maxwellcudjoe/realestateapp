import type { MetadataRoute } from 'next'
import { getInsights } from '@/lib/insights'
import { getAllLandingPages } from '@/lib/landing-pages'

const BASE_URL = 'https://www.revebatir.co.uk'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,         lastModified, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE_URL}/about`,    lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/deals`,    lastModified, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE_URL}/pricing`,  lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/tour`,     lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/insights`, lastModified, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE_URL}/register`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/contact`,  lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/privacy`,  lastModified, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE_URL}/terms`,    lastModified, changeFrequency: 'yearly',  priority: 0.3 },
  ]

  const insights = await getInsights()
  const insightEntries: MetadataRoute.Sitemap = insights.map((i) => ({
    url: `${BASE_URL}/insights/${i.slug}`,
    lastModified: new Date(i.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  const landingEntries: MetadataRoute.Sitemap = getAllLandingPages().map((p) => ({
    url: `${BASE_URL}/${p.strategySlug}/${p.citySlug}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticEntries, ...insightEntries, ...landingEntries]
}
