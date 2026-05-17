import { describe, it, expect } from 'vitest'
import { dealVisibilityWhere, isDealVisible } from '@/lib/deal-visibility'

describe('deal-visibility lib', () => {
  describe('dealVisibilityWhere', () => {
    const now = new Date('2026-05-17T12:00:00Z')

    it('PREMIUM gets OR with publishedAt <= now', () => {
      const where = dealVisibilityWhere('PREMIUM', now)
      expect(where).toEqual({
        OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
      })
    })

    it('FREE gets OR with publishedAt <= cutoff (48h ago)', () => {
      const where = dealVisibilityWhere('FREE', now) as { OR: { publishedAt: null | { lte: Date } }[] }
      expect(where.OR[0]).toEqual({ publishedAt: null })
      const lteValue = where.OR[1].publishedAt
      if (lteValue && typeof lteValue === 'object' && 'lte' in lteValue) {
        expect(lteValue.lte.toISOString()).toBe('2026-05-15T12:00:00.000Z')
      } else {
        throw new Error('Expected lte clause')
      }
    })
  })

  describe('isDealVisible', () => {
    const now = new Date('2026-05-17T12:00:00Z')

    it('legacy null publishedAt is visible to everyone', () => {
      expect(isDealVisible(null, 'FREE', now)).toBe(true)
      expect(isDealVisible(null, 'PREMIUM', now)).toBe(true)
    })

    it('PREMIUM sees deals as soon as published', () => {
      const published = new Date('2026-05-17T10:00:00Z')
      expect(isDealVisible(published, 'PREMIUM', now)).toBe(true)
    })

    it('FREE cannot see a deal published 2 hours ago', () => {
      const published = new Date('2026-05-17T10:00:00Z')
      expect(isDealVisible(published, 'FREE', now)).toBe(false)
    })

    it('FREE can see a deal published 49 hours ago', () => {
      const published = new Date('2026-05-15T11:00:00Z')
      expect(isDealVisible(published, 'FREE', now)).toBe(true)
    })

    it('FREE can see a deal published exactly 48 hours ago', () => {
      const published = new Date('2026-05-15T12:00:00Z')
      expect(isDealVisible(published, 'FREE', now)).toBe(true)
    })

    it('PREMIUM cannot see a future-dated deal', () => {
      const published = new Date('2026-05-18T00:00:00Z')
      expect(isDealVisible(published, 'PREMIUM', now)).toBe(false)
    })
  })
})
