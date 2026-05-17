import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFindFirst } = vi.hoisted(() => ({ mockFindFirst: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: { document: { findFirst: mockFindFirst } },
}))

import { hasActiveProofOfFunds, getMostRecentProofOfFunds, isPofFresh, pofCutoffDate, POF_FRESHNESS_MONTHS, POF_DOC_TYPE } from '@/lib/proof-of-funds'

describe('proof-of-funds lib', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('POF_FRESHNESS_MONTHS', () => {
    it('is 6 months', () => expect(POF_FRESHNESS_MONTHS).toBe(6))
  })

  describe('POF_DOC_TYPE', () => {
    it('is PROOF_OF_FUNDS', () => expect(POF_DOC_TYPE).toBe('PROOF_OF_FUNDS'))
  })

  describe('pofCutoffDate', () => {
    it('returns a date 6 months before now', () => {
      const now = new Date('2026-06-15T12:00:00Z')
      const cutoff = pofCutoffDate(now)
      expect(cutoff.toISOString()).toBe('2025-12-15T12:00:00.000Z')
    })
  })

  describe('isPofFresh', () => {
    it('returns true for a doc uploaded yesterday', () => {
      const now = new Date('2026-06-15T12:00:00Z')
      const yesterday = new Date('2026-06-14T12:00:00Z')
      expect(isPofFresh(yesterday, now)).toBe(true)
    })

    it('returns true for a doc uploaded exactly at cutoff', () => {
      const now = new Date('2026-06-15T12:00:00Z')
      const atCutoff = new Date('2025-12-15T12:00:00Z')
      expect(isPofFresh(atCutoff, now)).toBe(true)
    })

    it('returns false for a doc uploaded 7 months ago', () => {
      const now = new Date('2026-06-15T12:00:00Z')
      const old = new Date('2025-11-14T12:00:00Z')
      expect(isPofFresh(old, now)).toBe(false)
    })
  })

  describe('hasActiveProofOfFunds', () => {
    it('returns true when a fresh PROOF_OF_FUNDS doc exists', async () => {
      mockFindFirst.mockResolvedValue({ id: 'd1' })
      const result = await hasActiveProofOfFunds('app1')
      expect(result).toBe(true)
      const call = mockFindFirst.mock.calls[0][0]
      expect(call.where.applicationId).toBe('app1')
      expect(call.where.type).toBe('PROOF_OF_FUNDS')
      expect(call.where.uploadedAt.gte).toBeInstanceOf(Date)
    })

    it('returns false when no fresh PoF doc found', async () => {
      mockFindFirst.mockResolvedValue(null)
      const result = await hasActiveProofOfFunds('app1')
      expect(result).toBe(false)
    })
  })

  describe('getMostRecentProofOfFunds', () => {
    it('queries for the latest PoF doc ordered by uploadedAt desc', async () => {
      const uploadedAt = new Date()
      mockFindFirst.mockResolvedValue({ id: 'd1', fileName: 'statement.pdf', uploadedAt })
      const doc = await getMostRecentProofOfFunds('app1')
      expect(doc?.fileName).toBe('statement.pdf')
      const call = mockFindFirst.mock.calls[0][0]
      expect(call.orderBy.uploadedAt).toBe('desc')
    })

    it('returns null when no PoF doc exists', async () => {
      mockFindFirst.mockResolvedValue(null)
      const doc = await getMostRecentProofOfFunds('app1')
      expect(doc).toBeNull()
    })
  })
})
