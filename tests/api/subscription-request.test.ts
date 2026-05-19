import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockAuth, mockUserFindUnique, mockUserFindMany, mockMessageCreate, mockCreateNotification,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockUserFindMany: vi.fn(),
  mockMessageCreate: vi.fn(),
  mockCreateNotification: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique, findMany: mockUserFindMany },
    message: { create: mockMessageCreate },
  },
}))
vi.mock('@/lib/resend', () => ({ sendEmail: vi.fn().mockResolvedValue({ id: 'm' }) }))
vi.mock('@/lib/notifications', () => ({ createNotification: mockCreateNotification }))

async function getHandler() {
  const mod = await import('@/app/api/portal/subscription/request/route')
  return mod.POST
}

const req = (body: unknown) =>
  new Request('http://x/api/portal/subscription/request', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as import('next/server').NextRequest

describe('POST /api/portal/subscription/request — B1', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1', email: 'jane@example.com' } })
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      email: 'jane@example.com',
      investorProfile: {
        firstName: 'Jane',
        lastName: 'Doe',
        application: { id: 'app1' },
      },
      subscription: null,
    })
    mockUserFindMany.mockResolvedValue([{ id: 'admin1' }])
    mockMessageCreate.mockResolvedValue({ id: 'msg-1' })
  })

  it('rejects unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const POST = await getHandler()
    const res = await POST(req({ type: 'UPGRADE' }), {} as never)
    expect(res.status).toBe(401)
  })

  it('rejects invalid type', async () => {
    const POST = await getHandler()
    const res = await POST(req({ type: 'INVENTED' }), {} as never)
    expect(res.status).toBe(400)
  })

  it('returns 404 when investor has no application', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1', email: 'x@x', investorProfile: null, subscription: null,
    })
    const POST = await getHandler()
    const res = await POST(req({ type: 'UPGRADE' }), {} as never)
    expect(res.status).toBe(404)
  })

  it('creates a Message + notifies admin for UPGRADE request', async () => {
    const POST = await getHandler()
    const res = await POST(req({ type: 'UPGRADE', reason: 'want early-access deals' }), {} as never)
    expect(res.status).toBe(200)
    expect(mockMessageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          applicationId: 'app1',
          senderUserId: 'u1',
          subject: '[Subscription request] Upgrade to Premium',
        }),
      }),
    )
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin1',
        type: 'SUBSCRIPTION_REQUEST',
      }),
    )
  })

  it('creates a Message for CANCEL request when sub exists', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1', email: 'x@x',
      investorProfile: { firstName: 'Jane', lastName: 'Doe', application: { id: 'app1' } },
      subscription: {
        billingPeriod: 'MONTHLY', amount: 49,
        cancelledAt: null, nextRenewalAt: new Date('2026-06-01'),
      },
    })
    const POST = await getHandler()
    const res = await POST(req({ type: 'CANCEL', reason: 'moving abroad' }), {} as never)
    expect(res.status).toBe(200)
    expect(mockMessageCreate.mock.calls[0][0].data.subject).toBe('[Subscription request] Cancel subscription')
  })

  it('reason is optional', async () => {
    const POST = await getHandler()
    const res = await POST(req({ type: 'UPGRADE' }), {} as never)
    expect(res.status).toBe(200)
  })

  it('rejects oversized reason (> 2000 chars)', async () => {
    const POST = await getHandler()
    const res = await POST(req({ type: 'UPGRADE', reason: 'x'.repeat(2001) }), {} as never)
    expect(res.status).toBe(400)
  })
})
