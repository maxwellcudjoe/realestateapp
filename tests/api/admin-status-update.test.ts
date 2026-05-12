import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockFindUnique = vi.fn()
const mockUpdate = vi.fn()
const mockCreate = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    application: { findUnique: mockFindUnique, update: mockUpdate },
    statusHistory: { create: mockCreate },
  },
}))
vi.mock('@/lib/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'mock-id' }),
}))

async function getHandler() {
  const mod = await import('@/app/api/admin/investors/[id]/status/route')
  return mod.POST
}

describe('POST /api/admin/investors/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'a1', role: 'admin' } })
    mockFindUnique.mockResolvedValue({
      id: 'app1',
      status: 'SUBMITTED',
      investorProfile: { firstName: 'Jane', user: { email: 'jane@example.com' } },
    })
    mockUpdate.mockResolvedValue({ id: 'app1', status: 'UNDER_REVIEW' })
    mockCreate.mockResolvedValue({ id: 'h1' })
  })

  it('updates status and creates history entry', async () => {
    const POST = await getHandler()
    const req = new Request('http://localhost/api/admin/investors/app1/status', {
      method: 'POST',
      body: JSON.stringify({ status: 'UNDER_REVIEW', note: 'Looks good' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any, { params: { id: 'app1' } } as any)
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'app1' },
      data: expect.objectContaining({ status: 'UNDER_REVIEW' }),
    }))
    expect(mockCreate).toHaveBeenCalled()
  })

  it('returns 403 for non-admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    const POST = await getHandler()
    const req = new Request('http://localhost/api/admin/investors/app1/status', {
      method: 'POST',
      body: JSON.stringify({ status: 'UNDER_REVIEW' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any, { params: { id: 'app1' } } as any)
    expect(res.status).toBe(403)
  })
})
