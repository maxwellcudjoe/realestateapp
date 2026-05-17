import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockFindUnique = vi.fn()
const mockTransaction = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    investorProfile: { findUnique: mockFindUnique, update: vi.fn() },
    targetArea: { deleteMany: vi.fn(), createMany: vi.fn() },
    investorStrategy: { deleteMany: vi.fn(), createMany: vi.fn() },
    $transaction: mockTransaction,
  },
}))

async function getHandlers() {
  const mod = await import('@/app/api/portal/profile/route')
  return { GET: mod.GET, PATCH: mod.PATCH }
}

const VALID_PAYLOAD = {
  phone: '+447911123456',
  addressLine1: '123 Main St', city: 'London', postcode: 'E1 6AN',
  budgetMin: 100000, budgetMax: 300000,
  strategies: ['BTL'], buyerType: 'cash',
  targetAreaCodes: ['manchester'],
  experienceLevel: 'OWN_1_3', timelineToBuy: 'M_1_3',
  mortgageStatus: 'NONE', mortgageLender: '', referralSource: '',
  taxResidency: 'GB', niNumber: 'AB123456C',
  sourceOfFunds: 'SAVINGS', sourceOfFundsDetail: '',
  marketingConsent: false,
}

describe('PATCH /api/portal/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    mockFindUnique.mockResolvedValue({ id: 'p1', marketingConsentAt: null })
    mockTransaction.mockResolvedValue([])
  })

  function req(body: any) {
    return new Request('http://localhost/api/portal/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }) as any
  }

  it('rejects unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const { PATCH } = await getHandlers()
    const res = await PATCH(req(VALID_PAYLOAD))
    expect(res.status).toBe(401)
  })

  it('accepts a valid payload', async () => {
    const { PATCH } = await getHandlers()
    const res = await PATCH(req(VALID_PAYLOAD))
    expect(res.status).toBe(200)
    expect(mockTransaction).toHaveBeenCalled()
  })

  it('rejects invalid payload', async () => {
    const { PATCH } = await getHandlers()
    const res = await PATCH(req({ ...VALID_PAYLOAD, budgetMin: -100 }))
    expect(res.status).toBe(422)
  })

  it('rejects when profile not found', async () => {
    mockFindUnique.mockResolvedValue(null)
    const { PATCH } = await getHandlers()
    const res = await PATCH(req(VALID_PAYLOAD))
    expect(res.status).toBe(404)
  })

  it('requires mortgageStatus when buyerType is mortgage', async () => {
    const { PATCH } = await getHandlers()
    const res = await PATCH(req({ ...VALID_PAYLOAD, buyerType: 'mortgage', mortgageStatus: '' }))
    expect(res.status).toBe(422)
  })
})

describe('GET /api/portal/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
  })

  it('returns 401 without session', async () => {
    mockAuth.mockResolvedValue(null)
    const { GET } = await getHandlers()
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 404 when profile is missing', async () => {
    mockFindUnique.mockResolvedValue(null)
    const { GET } = await getHandlers()
    const res = await GET()
    expect(res.status).toBe(404)
  })
})
