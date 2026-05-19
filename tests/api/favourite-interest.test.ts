import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockDealFindFirst = vi.fn()
const mockFavUpsert = vi.fn()
const mockFavDeleteMany = vi.fn()
const mockInterestUpsert = vi.fn()
const mockInterestFind = vi.fn()
const mockInterestFindMany = vi.fn()
const mockInterestDelete = vi.fn()
const mockUserFindUnique = vi.fn()
const mockGetInvestorDeal = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    deal: { findFirst: mockDealFindFirst },
    dealFavourite: { upsert: mockFavUpsert, deleteMany: mockFavDeleteMany },
    contentfulDealInterest: {
      upsert: mockInterestUpsert,
      findUnique: mockInterestFind,
      findMany: mockInterestFindMany,
      deleteMany: mockInterestDelete,
    },
    user: { findUnique: mockUserFindUnique },
  },
}))
vi.mock('@/lib/resend', () => ({ sendEmail: vi.fn().mockResolvedValue({ id: 'm' }) }))
vi.mock('@/lib/deal-access', () => ({
  getInvestorDeal: mockGetInvestorDeal,
  getAdminDeal: vi.fn(),
  getDealForViewer: mockGetInvestorDeal,
}))

const ctxDeal = (dealId = 'd1') => ({ params: Promise.resolve({ dealId }) })

describe('Favourite toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    mockGetInvestorDeal.mockResolvedValue({ id: 'd1' })
  })

  it('POST favourites the deal for the owning investor', async () => {
    const { POST } = await import('@/app/api/portal/deals/[dealId]/favourite/route')
    const res = await POST(new Request('http://x') as any, ctxDeal())
    expect(res.status).toBe(200)
    expect(mockFavUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { dealId_userId: { dealId: 'd1', userId: 'u1' } },
    }))
  })

  it('POST returns 404 if deal does not belong to the user (or tier-hidden)', async () => {
    mockGetInvestorDeal.mockResolvedValue(null)
    const { POST } = await import('@/app/api/portal/deals/[dealId]/favourite/route')
    const res = await POST(new Request('http://x') as any, ctxDeal())
    expect(res.status).toBe(404)
    expect(mockFavUpsert).not.toHaveBeenCalled()
  })

  it('DELETE removes the favourite', async () => {
    const { DELETE } = await import('@/app/api/portal/deals/[dealId]/favourite/route')
    const res = await DELETE(new Request('http://x', { method: 'DELETE' }) as any, ctxDeal())
    expect(res.status).toBe(200)
    expect(mockFavDeleteMany).toHaveBeenCalled()
  })
})

describe('Contentful interest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    mockInterestFind.mockResolvedValue(null) // first save
    mockUserFindUnique.mockResolvedValue({ email: 'jane@example.com', investorProfile: { firstName: 'Jane', lastName: 'Smith' } })
  })

  const req = (body: any, method = 'POST') =>
    new Request('http://localhost/api/portal/contentful-interest', {
      method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
    }) as any

  it('POST upserts the interest', async () => {
    const { POST } = await import('@/app/api/portal/contentful-interest/route')
    const res = await POST(req({ contentfulEntryId: 'cf1', title: 'Demo deal' }))
    expect(res.status).toBe(200)
    expect(mockInterestUpsert).toHaveBeenCalled()
  })

  it('POST rejects when contentfulEntryId missing', async () => {
    const { POST } = await import('@/app/api/portal/contentful-interest/route')
    const res = await POST(req({}))
    expect(res.status).toBe(400)
  })

  it('GET returns user entries', async () => {
    mockInterestFindMany.mockResolvedValue([
      { id: 'i1', contentfulEntryId: 'cf1', title: 'Demo', slug: 'demo', createdAt: new Date() },
    ])
    const { GET } = await import('@/app/api/portal/contentful-interest/route')
    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.entries).toHaveLength(1)
  })

  it('GET returns empty array when no session (no leakage)', async () => {
    mockAuth.mockResolvedValue(null)
    const { GET } = await import('@/app/api/portal/contentful-interest/route')
    const res = await GET()
    const json = await res.json()
    expect(json.entries).toEqual([])
  })
})
