import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockAuth, mockUserFindUnique, mockUserUpdate, mockSubFindUnique, mockSubCreate, mockSubUpdate, mockTransaction,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockSubFindUnique: vi.fn(),
  mockSubCreate: vi.fn(),
  mockSubUpdate: vi.fn(),
  mockTransaction: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
    subscription: { findUnique: mockSubFindUnique, create: mockSubCreate, update: mockSubUpdate },
    $transaction: mockTransaction,
  },
}))
vi.mock('@/lib/resend', () => ({ sendEmail: vi.fn().mockResolvedValue({ id: 'm' }) }))

async function getHandlers() {
  return await import('@/app/api/admin/subscriptions/[userId]/route')
}

const ctx = (userId = 'u1') => ({ params: Promise.resolve({ userId }) })

describe('DELETE /api/admin/subscriptions/[userId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'a1', role: 'admin' } })
  })

  it('rejects non-admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    const { DELETE } = await getHandlers()
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }) as unknown as import('next/server').NextRequest, ctx())
    expect(res.status).toBe(403)
  })

  it('returns 404 when no subscription exists', async () => {
    mockSubFindUnique.mockResolvedValue(null)
    const { DELETE } = await getHandlers()
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }) as unknown as import('next/server').NextRequest, ctx())
    expect(res.status).toBe(404)
  })

  it('returns 409 when subscription is already cancelled', async () => {
    mockSubFindUnique.mockResolvedValue({ userId: 'u1', cancelledAt: new Date('2026-04-01') })
    const { DELETE } = await getHandlers()
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }) as unknown as import('next/server').NextRequest, ctx())
    expect(res.status).toBe(409)
  })

  it('cancels the subscription WITHOUT demoting User.tier (C7 fix)', async () => {
    mockSubFindUnique.mockResolvedValue({ userId: 'u1', cancelledAt: null })
    mockSubUpdate.mockResolvedValue({})
    const { DELETE } = await getHandlers()
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }) as unknown as import('next/server').NextRequest, ctx())
    expect(res.status).toBe(200)
    // Critical: User.tier must NOT be touched on cancel — effectiveTier() handles
    // the runtime downgrade once nextRenewalAt passes
    expect(mockUserUpdate).not.toHaveBeenCalled()
    expect(mockSubUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cancelledAt: expect.any(Date) }) }),
    )
  })
})
