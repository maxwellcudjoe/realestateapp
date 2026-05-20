import { describe, it, expect, beforeEach, vi } from 'vitest'

const getEntriesMock = vi.fn()

vi.mock('contentful', () => ({
  createClient: () => ({
    getEntries: getEntriesMock,
  }),
}))

import {
  getInsights,
  getInsight,
  getRelatedInsights,
  formatPublishedDate,
  INSIGHT_CATEGORIES,
} from '@/lib/insights'

function makeEntry(opts: {
  id: string
  slug: string
  title?: string
  summary?: string
  category?: string
  publishedAt?: string
  readingMinutes?: number
  featured?: boolean
  heroImageUrl?: string | null
}) {
  return {
    sys: { id: opts.id, createdAt: '2026-01-01T00:00:00.000Z' },
    fields: {
      title: opts.title ?? `Title ${opts.id}`,
      slug: opts.slug,
      summary: opts.summary ?? 'Summary text',
      body: { nodeType: 'document', content: [], data: {} },
      category: opts.category ?? 'Strategy',
      publishedAt: opts.publishedAt ?? '2026-05-01T00:00:00.000Z',
      readingMinutes: opts.readingMinutes ?? 5,
      author: 'Rêve Bâtir',
      featured: opts.featured ?? false,
      heroImage:
        opts.heroImageUrl === undefined
          ? { fields: { file: { url: '//images.ctfassets.net/x/y.jpg' } } }
          : opts.heroImageUrl
            ? { fields: { file: { url: opts.heroImageUrl.replace('https:', '') } } }
            : undefined,
    },
  }
}

describe('insights lib', () => {
  beforeEach(() => {
    getEntriesMock.mockReset()
    process.env.CONTENTFUL_SPACE_ID = 'test-space'
    process.env.CONTENTFUL_ACCESS_TOKEN = 'test-token'
  })

  describe('getInsights', () => {
    it('returns mapped entries from contentful', async () => {
      getEntriesMock.mockResolvedValueOnce({
        items: [makeEntry({ id: '1', slug: 'a' }), makeEntry({ id: '2', slug: 'b', featured: true })],
      })
      const insights = await getInsights()
      expect(insights).toHaveLength(2)
      expect(insights[0]).toMatchObject({ id: '1', slug: 'a', category: 'Strategy', readingMinutes: 5 })
      expect(insights[0].heroImageUrl).toBe('https://images.ctfassets.net/x/y.jpg')
    })

    it('filters by featured when requested', async () => {
      getEntriesMock.mockResolvedValueOnce({ items: [] })
      await getInsights({ featured: true })
      expect(getEntriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ 'fields.featured': true, content_type: 'insight' }),
      )
    })

    it('passes limit through to contentful query', async () => {
      getEntriesMock.mockResolvedValueOnce({ items: [] })
      await getInsights({ limit: 3 })
      expect(getEntriesMock).toHaveBeenCalledWith(expect.objectContaining({ limit: 3 }))
    })

    it('filters out entries with empty slug', async () => {
      getEntriesMock.mockResolvedValueOnce({
        items: [makeEntry({ id: '1', slug: 'good' }), makeEntry({ id: '2', slug: '' })],
      })
      const insights = await getInsights()
      expect(insights.map((i) => i.id)).toEqual(['1'])
    })

    it('returns empty array on contentful error', async () => {
      getEntriesMock.mockRejectedValueOnce(new Error('boom'))
      const insights = await getInsights()
      expect(insights).toEqual([])
    })

    it('returns empty array when env vars missing (no client created)', async () => {
      vi.resetModules()
      delete process.env.CONTENTFUL_SPACE_ID
      delete process.env.CONTENTFUL_ACCESS_TOKEN
      const fresh = await import('@/lib/insights')
      const insights = await fresh.getInsights()
      expect(insights).toEqual([])
      expect(getEntriesMock).not.toHaveBeenCalled()
    })

    it('coerces unknown category to Strategy', async () => {
      getEntriesMock.mockResolvedValueOnce({
        items: [makeEntry({ id: '1', slug: 'a', category: 'BogusCategory' })],
      })
      const insights = await getInsights()
      expect(insights[0].category).toBe('Strategy')
    })

    it('clamps readingMinutes to a sensible range', async () => {
      getEntriesMock.mockResolvedValueOnce({
        items: [
          makeEntry({ id: '1', slug: 'a', readingMinutes: 0 }),
          makeEntry({ id: '2', slug: 'b', readingMinutes: 999 }),
        ],
      })
      const insights = await getInsights()
      expect(insights[0].readingMinutes).toBe(1)
      expect(insights[1].readingMinutes).toBe(60)
    })
  })

  describe('getInsight', () => {
    it('returns the first matching insight', async () => {
      getEntriesMock.mockResolvedValueOnce({
        items: [makeEntry({ id: '1', slug: 'btl-explained' })],
      })
      const insight = await getInsight('btl-explained')
      expect(insight?.slug).toBe('btl-explained')
      expect(getEntriesMock).toHaveBeenCalledWith(
        expect.objectContaining({ 'fields.slug': 'btl-explained', limit: 1 }),
      )
    })

    it('returns null when slug is empty', async () => {
      const insight = await getInsight('')
      expect(insight).toBeNull()
      expect(getEntriesMock).not.toHaveBeenCalled()
    })

    it('returns null when not found', async () => {
      getEntriesMock.mockResolvedValueOnce({ items: [] })
      const insight = await getInsight('missing')
      expect(insight).toBeNull()
    })
  })

  describe('getRelatedInsights', () => {
    it('excludes the current slug from results', async () => {
      getEntriesMock.mockResolvedValueOnce({
        items: [
          makeEntry({ id: '1', slug: 'current' }),
          makeEntry({ id: '2', slug: 'other' }),
        ],
      })
      const related = await getRelatedInsights('current', 'Strategy', 3)
      expect(related.map((i) => i.slug)).toEqual(['other'])
    })

    it('uses category filter and ne-slug operator', async () => {
      getEntriesMock.mockResolvedValueOnce({ items: [] })
      await getRelatedInsights('foo', 'Tax', 5)
      expect(getEntriesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          'fields.category': 'Tax',
          'fields.slug[ne]': 'foo',
          limit: 5,
        }),
      )
    })
  })

  describe('formatPublishedDate', () => {
    it('formats ISO date as en-GB short month', () => {
      const formatted = formatPublishedDate('2026-03-15T00:00:00.000Z')
      expect(formatted).toMatch(/15.*Mar.*2026/)
    })

    it('returns empty string on invalid input', () => {
      expect(formatPublishedDate('not-a-date')).toMatch(/Invalid|^$/)
    })
  })

  describe('INSIGHT_CATEGORIES', () => {
    it('contains the 5 documented categories', () => {
      expect(INSIGHT_CATEGORIES).toEqual(['Strategy', 'Compliance', 'Tax', 'Market', 'Process'])
    })
  })
})
