import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockAuth, mockUserFindUnique, mockDealFindUnique, mockGetInvestorDeal, mockDealResponseCreate, mockDealResponseUpdate, mockDealResponseDelete,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockDealFindUnique: vi.fn(),
  mockGetInvestorDeal: vi.fn(),
  mockDealResponseCreate: vi.fn(),
  mockDealResponseUpdate: vi.fn(),
  mockDealResponseDelete: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    deal: { findUnique: mockDealFindUnique },
    dealResponse: { create: mockDealResponseCreate, update: mockDealResponseUpdate, delete: mockDealResponseDelete },
  },
}))
vi.mock('@/lib/resend', () => ({ sendEmail: vi.fn().mockResolvedValue({ id: 'm' }) }))
vi.mock('@/lib/deal-access', () => ({
  getInvestorDeal: mockGetInvestorDeal,
  getAdminDeal: vi.fn(),
  getDealForViewer: mockGetInvestorDeal,
}))

async function getHandlers() {
  return await import('@/app/api/portal/deals/[dealId]/response/route')
}

const req = (body: unknown, method = 'POST') =>
  new Request('http://localhost/api/portal/deals/d1/response', {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as import('next/server').NextRequest

const ctx = (dealId = 'd1') => ({ params: { dealId } as { dealId: string } })

describe('POST /api/portal/deals/[dealId]/response', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1', email: 'jane@x' } })
    mockUserFindUnique.mockResolvedValue({
      id: 'u1', investorProfile: { firstName: 'Jane', lastName: 'Doe' },
    })
    mockGetInvestorDeal.mockResolvedValue({
      id: 'd1', applicationId: 'app1', title: 'X', address: 'Y', response: null,
    })
  })

  it('creates a response when none exists', async () => {
    mockDealResponseCreate.mockResolvedValue({})
    const { POST } = await getHandlers()
    const res = await POST(req({ intent: 'ACCEPT' }), ctx())
    expect(res.status).toBe(200)
    expect(mockDealResponseCreate).toHaveBeenCalled()
  })

  it('rejects unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await getHandlers()
    expect((await POST(req({ intent: 'ACCEPT' }), ctx())).status).toBe(401)
  })

  it('returns 404 for foreign deal (or tier-hidden)', async () => {
    mockGetInvestorDeal.mockResolvedValue(null)
    const { POST } = await getHandlers()
    expect((await POST(req({ intent: 'ACCEPT' }), ctx())).status).toBe(404)
  })

  it('returns 409 when response already exists (in-memory check)', async () => {
    mockGetInvestorDeal.mockResolvedValue({ id: 'd1', applicationId: 'app1', response: { intent: 'PASS' } })
    const { POST } = await getHandlers()
    expect((await POST(req({ intent: 'ACCEPT' }), ctx())).status).toBe(409)
  })

  it('returns friendly 409 (not 500) on DB unique-constraint race (H7 fix)', async () => {
    mockDealResponseCreate.mockRejectedValue(Object.assign(new Error('Unique constraint'), { code: 'P2002' }))
    const { POST } = await getHandlers()
    const res = await POST(req({ intent: 'ACCEPT' }), ctx())
    expect(res.status).toBe(409)
  })
})
