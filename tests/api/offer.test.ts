import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockFindFirst = vi.fn()
const mockFindUnique = vi.fn()
const mockTransaction = vi.fn()
const mockOfferCreate = vi.fn()
const mockOfferUpdate = vi.fn()
const mockHasPof = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    deal: { findFirst: mockFindFirst, findUnique: mockFindUnique, update: vi.fn() },
    offer: { create: mockOfferCreate, update: mockOfferUpdate },
    dealStageHistory: { create: vi.fn() },
    $transaction: mockTransaction,
  },
}))
vi.mock('@/lib/resend', () => ({ sendEmail: vi.fn().mockResolvedValue({ id: 'm' }) }))
vi.mock('@/lib/proof-of-funds', () => ({ hasActiveProofOfFunds: mockHasPof }))

async function getPortalHandlers() {
  return await import('@/app/api/portal/deals/[dealId]/offer/route')
}
async function getAdminHandler() {
  const mod = await import('@/app/api/admin/deals/[dealId]/offer-decision/route')
  return mod.PATCH
}

const ctx = (dealId = 'd1') => ({ params: Promise.resolve({ dealId }) })
const req = (body: any, method = 'POST') =>
  new Request('http://localhost/api/portal/deals/d1/offer', {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any

const VALID = { amount: 250000, depositPercent: 25, financingSource: 'MORTGAGE', targetExchangeDate: '', conditions: '' }

describe('POST /api/portal/deals/[dealId]/offer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    mockFindFirst.mockResolvedValue({
      id: 'd1', applicationId: 'app1', stage: 'PROPOSED', title: 'X', address: 'Y',
      offer: null,
      response: { intent: 'ACCEPT' },
      application: { id: 'app1', investorProfile: { firstName: 'Jane' } },
    })
    mockTransaction.mockResolvedValue([])
    mockHasPof.mockResolvedValue(true)
  })

  it('rejects unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await getPortalHandlers()
    expect((await POST(req(VALID), ctx())).status).toBe(401)
  })

  it('rejects invalid payload', async () => {
    const { POST } = await getPortalHandlers()
    expect((await POST(req({ ...VALID, amount: -1 }), ctx())).status).toBe(400)
  })

  it('returns 404 when deal not found / wrong owner', async () => {
    mockFindFirst.mockResolvedValue(null)
    const { POST } = await getPortalHandlers()
    expect((await POST(req(VALID), ctx())).status).toBe(404)
  })

  it('rejects when offer already exists', async () => {
    mockFindFirst.mockResolvedValue({ id: 'd1', stage: 'OFFER_PENDING', offer: { id: 'o1' }, response: { intent: 'ACCEPT' }, application: { investorProfile: { firstName: 'Jane' } } })
    const { POST } = await getPortalHandlers()
    expect((await POST(req(VALID), ctx())).status).toBe(409)
  })

  it('creates offer and triggers transaction', async () => {
    const { POST } = await getPortalHandlers()
    const res = await POST(req(VALID), ctx())
    expect(res.status).toBe(200)
    expect(mockTransaction).toHaveBeenCalled()
  })

  it('rejects offer when no fresh proof of funds is on file', async () => {
    mockHasPof.mockResolvedValue(false)
    const { POST } = await getPortalHandlers()
    const res = await POST(req(VALID), ctx())
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('POF_REQUIRED')
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('rejects offer when investor has not responded with intent=ACCEPT', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'd1', applicationId: 'app1', stage: 'PROPOSED', title: 'X', address: 'Y',
      offer: null,
      response: { intent: 'PASS' },
      application: { id: 'app1', investorProfile: { firstName: 'Jane' } },
    })
    const { POST } = await getPortalHandlers()
    const res = await POST(req(VALID), ctx())
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('RESPONSE_REQUIRED')
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('rejects offer when investor has no DealResponse at all', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'd1', applicationId: 'app1', stage: 'PROPOSED', title: 'X', address: 'Y',
      offer: null,
      response: null,
      application: { id: 'app1', investorProfile: { firstName: 'Jane' } },
    })
    const { POST } = await getPortalHandlers()
    const res = await POST(req(VALID), ctx())
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('RESPONSE_REQUIRED')
  })

  it('returns friendly 409 (not 500) when DB rejects duplicate offer (race)', async () => {
    mockTransaction.mockRejectedValue(Object.assign(new Error('Unique constraint'), { code: 'P2002' }))
    const { POST } = await getPortalHandlers()
    const res = await POST(req(VALID), ctx())
    expect(res.status).toBe(409)
  })
})

describe('PATCH /api/portal/deals/[dealId]/offer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    mockFindFirst.mockResolvedValue({
      id: 'd1', applicationId: 'app1', stage: 'OFFER_PENDING', title: 'X', address: 'Y',
      offer: { id: 'o1', status: 'PENDING' },
      response: { intent: 'ACCEPT' },
      application: { id: 'app1', investorProfile: { firstName: 'Jane' } },
    })
    mockOfferUpdate.mockResolvedValue({})
    mockHasPof.mockResolvedValue(true)
  })

  it('refuses to edit a decided offer', async () => {
    mockFindFirst.mockResolvedValue({ id: 'd1', applicationId: 'app1', offer: { id: 'o1', status: 'ACCEPTED' }, application: { id: 'app1', investorProfile: { firstName: 'Jane' } } })
    const { PATCH } = await getPortalHandlers()
    expect((await PATCH(req(VALID, 'PATCH'), ctx())).status).toBe(409)
  })

  it('updates a pending offer', async () => {
    const { PATCH } = await getPortalHandlers()
    expect((await PATCH(req(VALID, 'PATCH'), ctx())).status).toBe(200)
    expect(mockOfferUpdate).toHaveBeenCalled()
  })

  it('rejects PATCH when proof of funds has expired (C3)', async () => {
    mockHasPof.mockResolvedValue(false)
    const { PATCH } = await getPortalHandlers()
    const res = await PATCH(req(VALID, 'PATCH'), ctx())
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('POF_REQUIRED')
    expect(mockOfferUpdate).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/portal/deals/[dealId]/offer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    mockFindFirst.mockResolvedValue({
      id: 'd1', stage: 'OFFER_PENDING',
      offer: { id: 'o1', status: 'PENDING' },
      application: { investorProfile: { firstName: 'Jane' } },
    })
    mockOfferUpdate.mockResolvedValue({})
  })

  it('withdraws a pending offer (sets status WITHDRAWN)', async () => {
    const { DELETE } = await getPortalHandlers()
    const res = await DELETE(new Request('http://localhost/api/portal/deals/d1/offer', { method: 'DELETE' }) as any, ctx())
    expect(res.status).toBe(200)
    expect(mockOfferUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'WITHDRAWN' }),
    }))
  })
})

describe('PATCH /api/admin/deals/[dealId]/offer-decision', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'a1', role: 'admin' } })
    mockFindUnique.mockResolvedValue({
      id: 'd1', stage: 'OFFER_PENDING', address: 'Y',
      offer: { id: 'o1', status: 'PENDING' },
      application: { investorProfile: { firstName: 'Jane', user: { email: 'jane@example.com' } } },
    })
    mockTransaction.mockResolvedValue([])
  })

  it('rejects non-admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    const PATCH = await getAdminHandler()
    expect((await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ decision: 'ACCEPTED' }), headers: { 'Content-Type': 'application/json' } }) as any, ctx())).status).toBe(403)
  })

  it('records ACCEPTED decision and advances stage', async () => {
    const PATCH = await getAdminHandler()
    const res = await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ decision: 'ACCEPTED', vendorDecisionNote: 'great' }), headers: { 'Content-Type': 'application/json' } }) as any, ctx())
    expect(res.status).toBe(200)
    expect(mockTransaction).toHaveBeenCalled()
  })

  it('rejects when offer already decided', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'd1', stage: 'OFFER_ACCEPTED',
      offer: { status: 'ACCEPTED' },
      application: { investorProfile: { firstName: 'Jane', user: { email: 'jane@x' } } },
    })
    const PATCH = await getAdminHandler()
    const res = await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ decision: 'REJECTED' }), headers: { 'Content-Type': 'application/json' } }) as any, ctx())
    expect(res.status).toBe(409)
  })
})
