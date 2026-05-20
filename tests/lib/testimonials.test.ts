import { describe, it, expect, beforeEach, vi } from 'vitest'

const getEntriesMock = vi.fn()

vi.mock('contentful', () => ({
  createClient: () => ({
    getEntries: getEntriesMock,
  }),
}))

import { getTestimonials, getInitialsFromName } from '@/lib/testimonials'

function makeEntry(opts: {
  id: string
  consentRecorded?: boolean
  quote?: string
  name?: string
  role?: string
  featured?: boolean
  displayOrder?: number
  photoUrl?: string | null
}) {
  return {
    sys: { id: opts.id },
    fields: {
      quote: opts.quote ?? 'A truly great experience working with the team.',
      name: opts.name ?? 'Jane Smith',
      role: opts.role ?? 'BTL Investor · Manchester',
      consentRecorded: opts.consentRecorded ?? true,
      consentDate: '2026-04-01T00:00:00.000Z',
      featured: opts.featured ?? true,
      displayOrder: opts.displayOrder ?? 1,
      photo:
        opts.photoUrl === null
          ? undefined
          : { fields: { file: { url: (opts.photoUrl ?? '//images.ctfassets.net/p/q.jpg').replace('https:', '') } } },
    },
  }
}

describe('testimonials lib', () => {
  beforeEach(() => {
    getEntriesMock.mockReset()
    process.env.CONTENTFUL_SPACE_ID = 'test-space'
    process.env.CONTENTFUL_ACCESS_TOKEN = 'test-token'
  })

  it('returns mapped + featured-only testimonials when requested', async () => {
    getEntriesMock.mockResolvedValueOnce({
      items: [makeEntry({ id: '1' }), makeEntry({ id: '2', featured: false })],
    })
    const results = await getTestimonials({ featured: true })
    expect(getEntriesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content_type: 'testimonial',
        'fields.featured': true,
        order: 'fields.displayOrder',
      }),
    )
    expect(results).toHaveLength(2)
  })

  it('CRITICAL: drops entries with consentRecorded !== true', async () => {
    const consenting = makeEntry({ id: '1', consentRecorded: true })
    const declined = makeEntry({ id: '2', consentRecorded: false })
    const missing = makeEntry({ id: '3' })
    delete (missing.fields as Record<string, unknown>).consentRecorded
    getEntriesMock.mockResolvedValueOnce({ items: [consenting, declined, missing] })
    const results = await getTestimonials()
    expect(results.map((r) => r.id)).toEqual(['1'])
  })

  it('drops entries missing required fields', async () => {
    getEntriesMock.mockResolvedValueOnce({
      items: [
        makeEntry({ id: '1', quote: '' }),
        makeEntry({ id: '2', name: '' }),
        makeEntry({ id: '3', role: '' }),
        makeEntry({ id: '4' }),
      ],
    })
    const results = await getTestimonials()
    expect(results.map((r) => r.id)).toEqual(['4'])
  })

  it('maps photoUrl to https-prefixed asset URL', async () => {
    getEntriesMock.mockResolvedValueOnce({
      items: [makeEntry({ id: '1' })],
    })
    const [t] = await getTestimonials()
    expect(t.photoUrl).toBe('https://images.ctfassets.net/p/q.jpg')
  })

  it('returns empty array on contentful error', async () => {
    getEntriesMock.mockRejectedValueOnce(new Error('boom'))
    const results = await getTestimonials()
    expect(results).toEqual([])
  })

  it('returns empty array when env vars missing (no client created)', async () => {
    vi.resetModules()
    delete process.env.CONTENTFUL_SPACE_ID
    delete process.env.CONTENTFUL_ACCESS_TOKEN
    const fresh = await import('@/lib/testimonials')
    const results = await fresh.getTestimonials()
    expect(results).toEqual([])
    expect(getEntriesMock).not.toHaveBeenCalled()
  })
})

describe('getInitialsFromName', () => {
  it('returns first letter of first and last name uppercased', () => {
    expect(getInitialsFromName('James Henderson')).toBe('JH')
    expect(getInitialsFromName('jane mary smith')).toBe('JS')
  })

  it('handles a single name', () => {
    expect(getInitialsFromName('Cher')).toBe('CH')
  })

  it('handles empty / whitespace name', () => {
    expect(getInitialsFromName('')).toBe('·')
    expect(getInitialsFromName('   ')).toBe('·')
  })
})
