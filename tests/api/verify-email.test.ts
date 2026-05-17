import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFindUnique = vi.fn()
const mockUpdateMany = vi.fn()
const mockCreate = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mockFindUnique },
    emailVerificationToken: {
      updateMany: mockUpdateMany,
      create: mockCreate,
      findUnique: mockFindUnique, // separate mocks per test below
    },
    user_update: vi.fn(),
    $transaction: vi.fn(),
  },
}))

const mockSendEmail = vi.fn().mockResolvedValue({ id: 'm1' })
vi.mock('@/lib/resend', () => ({ sendEmail: mockSendEmail }))

describe('POST /api/auth/verify-email/request', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateMany.mockResolvedValue({ count: 0 })
    mockCreate.mockResolvedValue({ id: 't1' })
  })

  async function getHandler() {
    const mod = await import('@/app/api/auth/verify-email/request/route')
    return mod.POST
  }

  it('returns 200 even when user does not exist (no enumeration)', async () => {
    mockFindUnique.mockResolvedValue(null)
    const POST = await getHandler()
    const req = new Request('http://localhost/api/auth/verify-email/request', {
      method: 'POST',
      body: JSON.stringify({ email: 'unknown@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns 200 and skips email when user is already verified', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'u1',
      email: 'jane@example.com',
      emailVerifiedAt: new Date(),
      investorProfile: { firstName: 'Jane' },
    })
    const POST = await getHandler()
    const req = new Request('http://localhost/api/auth/verify-email/request', {
      method: 'POST',
      body: JSON.stringify({ email: 'jane@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('creates a token and sends email when user is unverified', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'u1',
      email: 'jane@example.com',
      emailVerifiedAt: null,
      investorProfile: { firstName: 'Jane' },
    })
    const POST = await getHandler()
    const req = new Request('http://localhost/api/auth/verify-email/request', {
      method: 'POST',
      body: JSON.stringify({ email: 'jane@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', usedAt: null },
      data: expect.objectContaining({ usedAt: expect.any(Date) }),
    })
    expect(mockCreate).toHaveBeenCalled()
    expect(mockSendEmail).toHaveBeenCalledOnce()
  })

  it('returns 400 when email missing', async () => {
    const POST = await getHandler()
    const req = new Request('http://localhost/api/auth/verify-email/request', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })
})
