import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockFindMany = vi.fn()
const mockAppFindMany = vi.fn()
const mockTransaction = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    investorProfile: { findMany: mockFindMany },
    application: { findMany: mockAppFindMany },
    deal: { create: vi.fn() },
    $transaction: mockTransaction,
  },
}))
vi.mock('@/lib/resend', () => ({ sendEmail: vi.fn().mockResolvedValue({ id: 'm' }) }))

async function getMatch() {
  return (await import('@/app/api/admin/match/route')).POST
}
async function getBatch() {
  return (await import('@/app/api/admin/match/batch-post/route')).POST
}

const req = (body: any) =>
  new Request('http://x', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }) as any

describe('POST /api/admin/match', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'a1', role: 'admin' } })
    mockFindMany.mockResolvedValue([
      {
        id: 'p1', firstName: 'Jane', lastName: 'Smith',
        budgetMin: 100000, budgetMax: 300000, buyerType: 'cash', entityType: 'INDIVIDUAL',
        user: { id: 'u1', email: 'jane@example.com' },
        application: { id: 'a1' },
        structuredAreas: [{ code: 'manchester' }],
        strategies: [{ strategy: 'BTL' }],
      },
    ])
  })

  it('rejects non-admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    const POST = await getMatch()
    expect((await POST(req({ price: 250000 }))).status).toBe(403)
  })

  it('returns matches with all metadata', async () => {
    const POST = await getMatch()
    const res = await POST(req({ price: 250000, areaCode: 'manchester', strategyCode: 'BTL' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.count).toBe(1)
    expect(json.matches[0].email).toBe('jane@example.com')
  })

  it('filters profiles whose application is null', async () => {
    mockFindMany.mockResolvedValue([{ ...{
      id: 'p1', firstName: 'X', lastName: 'Y',
      budgetMin: 0, budgetMax: 0, buyerType: 'cash', entityType: 'INDIVIDUAL',
      user: { id: 'u1', email: 'x@y' }, application: null,
      structuredAreas: [], strategies: [],
    } }])
    const POST = await getMatch()
    const res = await POST(req({ price: 100 }))
    const json = await res.json()
    expect(json.count).toBe(0)
  })
})

describe('POST /api/admin/match/batch-post', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'a1', role: 'admin' } })
    mockAppFindMany.mockResolvedValue([
      { id: 'app1', investorProfile: { firstName: 'Jane', user: { email: 'jane@example.com' } } },
      { id: 'app2', investorProfile: { firstName: 'Bob', user: { email: 'bob@example.com' } } },
    ])
    mockTransaction.mockResolvedValue([])
  })

  it('rejects non-admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    const POST = await getBatch()
    expect((await POST(req({ applicationIds: ['a'], title: 't', address: 'a', askingPrice: 1 }))).status).toBe(403)
  })

  it('rejects empty applicationIds', async () => {
    const POST = await getBatch()
    expect((await POST(req({ applicationIds: [], title: 't', address: 'a', askingPrice: 1 }))).status).toBe(400)
  })

  it('returns 400 when no eligible recipients', async () => {
    mockAppFindMany.mockResolvedValue([])
    const POST = await getBatch()
    expect((await POST(req({ applicationIds: ['x'], title: 't', address: 'a', askingPrice: 1 }))).status).toBe(400)
  })

  it('creates deals in a transaction for matched recipients', async () => {
    const POST = await getBatch()
    const res = await POST(req({ applicationIds: ['app1', 'app2'], title: '3-bed BMV', address: '1 The Street', askingPrice: 250000 }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.posted).toBe(2)
    expect(mockTransaction).toHaveBeenCalled()
  })
})
