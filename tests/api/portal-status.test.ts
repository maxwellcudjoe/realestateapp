import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockFindUnique = vi.fn()

vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mockFindUnique },
  },
}))

async function getHandler() {
  const mod = await import('@/app/api/portal/status/route')
  return mod.GET
}

describe('GET /api/portal/status', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const GET = await getHandler()
    const req = new Request('http://localhost/api/portal/status')
    const res = await GET(req as any)
    expect(res.status).toBe(401)
  })

  it('returns application data for authenticated investor', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    mockFindUnique.mockResolvedValue({
      investorProfile: {
        firstName: 'Jane',
        lastName: 'Smith',
        application: {
          id: 'a1',
          status: 'SUBMITTED',
          createdAt: new Date(),
          updatedAt: new Date(),
          statusHistory: [
            { id: 's1', fromStatus: null, toStatus: 'SUBMITTED', note: 'Submitted', createdAt: new Date() },
          ],
          documents: [],
        },
      },
    })
    const GET = await getHandler()
    const req = new Request('http://localhost/api/portal/status')
    const res = await GET(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('SUBMITTED')
    expect(json.history).toHaveLength(1)
  })
})
