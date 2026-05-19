import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockDealFindFirst = vi.fn()
const mockDealFindUnique = vi.fn()
const mockMessageFindMany = vi.fn()
const mockMessageCreate = vi.fn()
const mockGetDealForViewer = vi.fn()
const mockCreateNotification = vi.fn().mockResolvedValue({})

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    deal: { findFirst: mockDealFindFirst, findUnique: mockDealFindUnique },
    message: { findMany: mockMessageFindMany, create: mockMessageCreate },
  },
}))
vi.mock('@/lib/resend', () => ({ sendEmail: vi.fn().mockResolvedValue({ id: 'm' }) }))
vi.mock('@/lib/notifications', () => ({ createNotification: mockCreateNotification }))
vi.mock('@/lib/deal-access', () => ({
  getInvestorDeal: mockGetDealForViewer,
  getAdminDeal: mockGetDealForViewer,
  getDealForViewer: mockGetDealForViewer,
}))

async function getHandlers() {
  return await import('@/app/api/portal/deals/[dealId]/messages/route')
}

const ctx = (dealId = 'd1') => ({ params: Promise.resolve({ dealId }) })

describe('GET /api/portal/deals/[dealId]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    mockGetDealForViewer.mockResolvedValue({
      id: 'd1', applicationId: 'a1',
      application: { investorProfile: { user: { email: 'jane@example.com' } } },
    })
    mockMessageFindMany.mockResolvedValue([])
  })

  it('rejects unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const { GET } = await getHandlers()
    expect((await GET(new Request('http://x') as any, ctx())).status).toBe(401)
  })

  it('returns messages for investor on the deal', async () => {
    mockMessageFindMany.mockResolvedValue([
      { id: 'm1', subject: 'Q', body: 'B', createdAt: new Date(), senderUserId: 'u1', senderUser: { id: 'u1', role: 'investor' } },
    ])
    const { GET } = await getHandlers()
    const res = await GET(new Request('http://x') as any, ctx())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.messages).toHaveLength(1)
    expect(json.messages[0].isMine).toBe(true)
  })

  it('returns 404 when investor does not own the deal', async () => {
    mockGetDealForViewer.mockResolvedValue(null)
    const { GET } = await getHandlers()
    expect((await GET(new Request('http://x') as any, ctx())).status).toBe(404)
  })

  it('allows admin to read any thread', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'a1', role: 'admin' } })
    mockGetDealForViewer.mockResolvedValue({ id: 'd1' })
    const { GET } = await getHandlers()
    expect((await GET(new Request('http://x') as any, ctx())).status).toBe(200)
    expect(mockGetDealForViewer).toHaveBeenCalledWith('d1', 'a1', 'admin')
  })
})

describe('POST /api/portal/deals/[dealId]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    mockGetDealForViewer.mockResolvedValue({
      id: 'd1', applicationId: 'a1', address: '1 The Street',
      application: { investorProfile: { firstName: 'Jane', user: { email: 'jane@example.com' } } },
    })
    mockMessageCreate.mockResolvedValue({ id: 'm-new' })
  })

  const send = (body: any) =>
    new Request('http://x', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }) as any

  it('rejects empty body', async () => {
    const { POST } = await getHandlers()
    expect((await POST(send({ subject: 'X', body: '' }), ctx())).status).toBe(400)
  })

  it('persists a message scoped to the deal', async () => {
    const { POST } = await getHandlers()
    const res = await POST(send({ subject: 'Q', body: 'Hello' }), ctx())
    expect(res.status).toBe(200)
    expect(mockMessageCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ dealId: 'd1', applicationId: 'a1', subject: 'Q' }),
    }))
  })
})
