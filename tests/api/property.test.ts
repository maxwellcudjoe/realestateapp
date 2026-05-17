import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockFindFirst = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    property: { findFirst: mockFindFirst, update: mockUpdate },
  },
}))

async function getPATCH() {
  return (await import('@/app/api/portal/properties/[propertyId]/route')).PATCH
}

const ctx = (propertyId = 'p1') => ({ params: Promise.resolve({ propertyId }) })
const req = (body: any) =>
  new Request('http://localhost/api/portal/properties/p1', {
    method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
  }) as any

describe('PATCH /api/portal/properties/[propertyId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    mockFindFirst.mockResolvedValue({
      id: 'p1', userId: 'u1', currentValueEstimate: 200000, currentValueUpdatedAt: null,
      tenancyStatus: 'VACANT', monthlyRent: null, tenancyStart: null, tenancyEnd: null, notes: null,
    })
    mockUpdate.mockResolvedValue({})
  })

  it('rejects unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const PATCH = await getPATCH()
    expect((await PATCH(req({}), ctx())).status).toBe(401)
  })

  it('rejects when property does not belong to the user', async () => {
    mockFindFirst.mockResolvedValue(null)
    const PATCH = await getPATCH()
    expect((await PATCH(req({}), ctx())).status).toBe(404)
  })

  it('persists tenancy + monthly rent changes', async () => {
    const PATCH = await getPATCH()
    const res = await PATCH(req({ tenancyStatus: 'TENANTED', monthlyRent: 1100 }), ctx())
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenancyStatus: 'TENANTED' }),
    }))
  })

  it('stamps currentValueUpdatedAt when value changes', async () => {
    const PATCH = await getPATCH()
    const res = await PATCH(req({ currentValueEstimate: 260000 }), ctx())
    expect(res.status).toBe(200)
    const call = mockUpdate.mock.calls[0][0]
    expect(call.data.currentValueUpdatedAt).toBeInstanceOf(Date)
  })

  it('does NOT bump updatedAt-stamp when value unchanged', async () => {
    const PATCH = await getPATCH()
    const res = await PATCH(req({ currentValueEstimate: 200000 }), ctx())
    expect(res.status).toBe(200)
    const call = mockUpdate.mock.calls[0][0]
    // currentValueUpdatedAt should remain the existing null value
    expect(call.data.currentValueUpdatedAt).toBeNull()
  })

  it('rejects invalid tenancy enum', async () => {
    const PATCH = await getPATCH()
    expect((await PATCH(req({ tenancyStatus: 'BOGUS' }), ctx())).status).toBe(400)
  })
})
