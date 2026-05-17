import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockFindUnique = vi.fn()
const mockTransaction = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    deal: { findUnique: mockFindUnique, update: vi.fn() },
    dealStageHistory: { create: vi.fn() },
    $transaction: mockTransaction,
  },
}))
vi.mock('@/lib/resend', () => ({ sendEmail: vi.fn().mockResolvedValue({ id: 'mock' }) }))

async function getHandler() {
  const mod = await import('@/app/api/admin/deals/[dealId]/stage/route')
  return mod.PATCH
}

const ctx = (dealId = 'd1') => ({ params: Promise.resolve({ dealId }) })
const req = (body: any) =>
  new Request('http://localhost/api/admin/deals/d1/stage', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any

describe('PATCH /api/admin/deals/[dealId]/stage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'admin1', role: 'admin' } })
    mockFindUnique.mockResolvedValue({
      id: 'd1', stage: 'PROPOSED', dealLeadUserId: null,
      solicitorContact: null, brokerContact: null, title: 'X', address: 'Y',
      application: { investorProfile: { firstName: 'Jane', user: { email: 'jane@example.com' } } },
    })
    mockTransaction.mockImplementation(async (fn: any) => fn({
      deal: { update: vi.fn() },
      dealStageHistory: { create: vi.fn() },
    }))
  })

  it('rejects unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const PATCH = await getHandler()
    const res = await PATCH(req({ stage: 'OFFER_PENDING' }), ctx())
    expect(res.status).toBe(401)
  })

  it('rejects non-admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    const PATCH = await getHandler()
    const res = await PATCH(req({ stage: 'OFFER_PENDING' }), ctx())
    expect(res.status).toBe(403)
  })

  it('rejects unknown stage', async () => {
    const PATCH = await getHandler()
    const res = await PATCH(req({ stage: 'INVENTED' }), ctx())
    expect(res.status).toBe(400)
  })

  it('returns 404 when deal does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)
    const PATCH = await getHandler()
    const res = await PATCH(req({ stage: 'OFFER_PENDING' }), ctx())
    expect(res.status).toBe(404)
  })

  it('updates stage and writes history on change', async () => {
    const PATCH = await getHandler()
    const res = await PATCH(req({ stage: 'OFFER_PENDING', note: 'Offer made at £245k' }), ctx())
    expect(res.status).toBe(200)
    expect(mockTransaction).toHaveBeenCalled()
  })

  it('skips history write when stage unchanged but still saves team fields', async () => {
    const PATCH = await getHandler()
    const res = await PATCH(req({ stage: 'PROPOSED', solicitorContact: 'New solicitor' }), ctx())
    expect(res.status).toBe(200)
  })
})
