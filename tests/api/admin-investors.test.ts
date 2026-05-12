import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockFindMany = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    application: { findMany: mockFindMany },
  },
}))

async function getHandler() {
  const mod = await import('@/app/api/admin/investors/route')
  return mod.GET
}

describe('GET /api/admin/investors', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 for unauthenticated requests', async () => {
    mockAuth.mockResolvedValue(null)
    const GET = await getHandler()
    const res = await GET(new Request('http://localhost/api/admin/investors') as any)
    expect(res.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    const GET = await getHandler()
    const res = await GET(new Request('http://localhost/api/admin/investors') as any)
    expect(res.status).toBe(403)
  })

  it('returns investor list for admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'a1', role: 'admin' } })
    mockFindMany.mockResolvedValue([
      {
        id: 'app1',
        status: 'SUBMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
        investorProfile: {
          firstName: 'Jane',
          lastName: 'Smith',
          strategy: 'BTL',
          budgetMin: 100000,
          budgetMax: 300000,
          buyerType: 'cash',
          user: { email: 'jane@example.com' },
        },
      },
    ])
    const GET = await getHandler()
    const res = await GET(new Request('http://localhost/api/admin/investors') as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.investors).toHaveLength(1)
    expect(json.investors[0].name).toBe('Jane Smith')
  })
})
