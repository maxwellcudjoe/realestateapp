import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockFindUnique = vi.fn()
const mockUpdate = vi.fn()
const mockDealFindFirst = vi.fn()
const mockDealFindUnique = vi.fn()
const mockViewingCreate = vi.fn()
const mockViewingFindMany = vi.fn()
const mockNotificationCreate = vi.fn().mockResolvedValue({})
const mockHasPof = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    viewing: { findUnique: mockFindUnique, update: mockUpdate, create: mockViewingCreate, findMany: mockViewingFindMany },
    deal: { findFirst: mockDealFindFirst, findUnique: mockDealFindUnique },
    notification: { create: mockNotificationCreate },
  },
}))
vi.mock('@/lib/resend', () => ({ sendEmail: vi.fn().mockResolvedValue({ id: 'm' }) }))
vi.mock('@/lib/notifications', () => ({ createNotification: mockNotificationCreate }))
vi.mock('@/lib/proof-of-funds', () => ({ hasActiveProofOfFunds: mockHasPof }))

async function getAdminHandler() {
  const mod = await import('@/app/api/admin/viewings/[viewingId]/route')
  return mod.PATCH
}

const ctx = (viewingId = 'v1') => ({ params: Promise.resolve({ viewingId }) })
const req = (body: unknown) =>
  new Request('http://localhost/api/admin/viewings/v1', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as import('next/server').NextRequest

const baseViewing = {
  id: 'v1',
  investorUserId: 'u1',
  dealId: 'd1',
  confirmedSlot: new Date('2026-05-20T10:00:00Z'),
  adminNote: null,
  status: 'CONFIRMED',
  deal: {
    address: '12 High St',
    application: { investorProfile: { user: { email: 'investor@example.com' } } },
  },
}

describe('PATCH /api/admin/viewings/[viewingId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'a1', role: 'admin' } })
    mockFindUnique.mockResolvedValue(baseViewing)
    mockUpdate.mockResolvedValue({})
  })

  it('rejects unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const PATCH = await getAdminHandler()
    const res = await PATCH(req({ status: 'COMPLETED' }), ctx())
    expect(res.status).toBe(401)
  })

  it('rejects non-admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    const PATCH = await getAdminHandler()
    const res = await PATCH(req({ status: 'COMPLETED' }), ctx())
    expect(res.status).toBe(403)
  })

  it('rejects invalid status enum', async () => {
    const PATCH = await getAdminHandler()
    const res = await PATCH(req({ status: 'FAKE' }), ctx())
    expect(res.status).toBe(400)
  })

  it('returns 404 when viewing not found', async () => {
    mockFindUnique.mockResolvedValue(null)
    const PATCH = await getAdminHandler()
    const res = await PATCH(req({ status: 'COMPLETED' }), ctx())
    expect(res.status).toBe(404)
  })

  it('rejects CONFIRMED without a confirmedSlot', async () => {
    mockFindUnique.mockResolvedValue({ ...baseViewing, confirmedSlot: null })
    const PATCH = await getAdminHandler()
    const res = await PATCH(req({ status: 'CONFIRMED' }), ctx())
    expect(res.status).toBe(400)
  })

  it('marks viewing as COMPLETED without requiring confirmedSlot in body', async () => {
    const PATCH = await getAdminHandler()
    const res = await PATCH(req({ status: 'COMPLETED' }), ctx())
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) }),
    )
  })

  it('cancels a CONFIRMED viewing and notifies investor', async () => {
    const PATCH = await getAdminHandler()
    const res = await PATCH(req({ status: 'CANCELLED', adminNote: 'agent unavailable' }), ctx())
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) }),
    )
    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        type: 'VIEWING',
      }),
    )
  })

  it('confirms a REQUESTED viewing when a future slot is supplied', async () => {
    mockFindUnique.mockResolvedValue({ ...baseViewing, status: 'REQUESTED', confirmedSlot: null })
    const PATCH = await getAdminHandler()
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const res = await PATCH(req({ status: 'CONFIRMED', confirmedSlot: future }), ctx())
    expect(res.status).toBe(200)
  })
})

async function getInvestorPostHandler() {
  const mod = await import('@/app/api/portal/deals/[dealId]/viewings/route')
  return mod.POST
}

const investorReq = (body: unknown) =>
  new Request('http://localhost/api/portal/deals/d1/viewings', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as import('next/server').NextRequest

const futureSlot = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
const dealCtx = (dealId = 'd1') => ({ params: Promise.resolve({ dealId }) })

describe('POST /api/portal/deals/[dealId]/viewings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    mockDealFindFirst.mockResolvedValue({
      id: 'd1', applicationId: 'app1', address: '12 High St', title: 'Cosy 2-bed',
      application: { id: 'app1', investorProfile: { firstName: 'Jane', user: { email: 'jane@example.com' } } },
    })
    mockViewingCreate.mockResolvedValue({})
    mockHasPof.mockResolvedValue(true)
  })

  it('creates a viewing when PoF is fresh', async () => {
    const POST = await getInvestorPostHandler()
    const res = await POST(investorReq({ requestedSlot: futureSlot() }), dealCtx())
    expect(res.status).toBe(200)
    expect(mockViewingCreate).toHaveBeenCalled()
  })

  it('rejects unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const POST = await getInvestorPostHandler()
    const res = await POST(investorReq({ requestedSlot: futureSlot() }), dealCtx())
    expect(res.status).toBe(401)
  })

  it('rejects when admin tries to request', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'a1', role: 'admin' } })
    mockDealFindUnique.mockResolvedValue({
      id: 'd1', applicationId: 'app1', address: 'X', title: 'T',
      application: { id: 'app1', investorProfile: { firstName: 'Jane', user: { email: 'jane@example.com' } } },
    })
    const POST = await getInvestorPostHandler()
    const res = await POST(investorReq({ requestedSlot: futureSlot() }), dealCtx())
    expect(res.status).toBe(403)
  })

  it('rejects a past slot', async () => {
    const POST = await getInvestorPostHandler()
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const res = await POST(investorReq({ requestedSlot: past }), dealCtx())
    expect(res.status).toBe(400)
  })

  it('rejects viewing request when no fresh proof of funds is on file', async () => {
    mockHasPof.mockResolvedValue(false)
    const POST = await getInvestorPostHandler()
    const res = await POST(investorReq({ requestedSlot: futureSlot() }), dealCtx())
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('POF_REQUIRED')
    expect(mockViewingCreate).not.toHaveBeenCalled()
  })
})
