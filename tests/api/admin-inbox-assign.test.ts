import { describe, it, expect, beforeEach, vi } from 'vitest'

const { prismaMock, authMock } = vi.hoisted(() => ({
  prismaMock: {
    emailMessage: { findUnique: vi.fn() },
    dealerThread: { update: vi.fn() },
    deal: { findUnique: vi.fn() },
  },
  authMock: vi.fn(async () => ({ user: { id: 'admin-1', role: 'admin' } })),
}))

vi.mock('@/lib/auth', () => ({ auth: authMock }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/audit', () => ({ recordAudit: vi.fn(async () => undefined) }))
vi.mock('@/lib/rate-limit', () => ({ getClientIp: vi.fn(() => '127.0.0.1') }))

import { POST } from '@/app/api/admin/inbox/assign/route'

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/admin/inbox/assign', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.emailMessage.findUnique.mockResolvedValue({ id: 'e1', threadId: 't1' })
  prismaMock.deal.findUnique.mockResolvedValue({ id: 'deal-Z' })
  prismaMock.dealerThread.update.mockResolvedValue({ id: 't1', dealId: 'deal-Z' })
})

describe('POST /api/admin/inbox/assign', () => {
  it('updates the thread with dealId and records audit', async () => {
    const { recordAudit } = await import('@/lib/audit')
    const res = await POST(makeReq({ emailId: 'e1', dealId: 'deal-Z' }))
    expect(res.status).toBe(200)
    expect(prismaMock.dealerThread.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 't1' },
      data: expect.objectContaining({ dealId: 'deal-Z' }),
    }))
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'INBOX_ASSIGN',
      resourceType: 'EmailMessage',
      resourceId: 'e1',
    }))
  })

  it('403 when not admin', async () => {
    authMock.mockResolvedValueOnce({ user: { id: 'u', role: 'investor' } })
    const res = await POST(makeReq({ emailId: 'e1', dealId: 'deal-Z' }))
    expect(res.status).toBe(403)
  })

  it('401 when no session', async () => {
    ;(authMock as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce(null)
    const res = await POST(makeReq({ emailId: 'e1', dealId: 'deal-Z' }))
    expect(res.status).toBe(401)
  })

  it('404 when email not found', async () => {
    prismaMock.emailMessage.findUnique.mockResolvedValueOnce(null)
    const res = await POST(makeReq({ emailId: 'missing', dealId: 'deal-Z' }))
    expect(res.status).toBe(404)
  })

  it('404 when deal not found', async () => {
    prismaMock.deal.findUnique.mockResolvedValueOnce(null)
    const res = await POST(makeReq({ emailId: 'e1', dealId: 'missing-deal' }))
    expect(res.status).toBe(404)
  })

  it('400 on invalid input', async () => {
    const res = await POST(makeReq({ emailId: 'e1' }))
    expect(res.status).toBe(400)
  })
})
