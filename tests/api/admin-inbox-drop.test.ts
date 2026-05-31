import { describe, it, expect, beforeEach, vi } from 'vitest'

const { prismaMock, authMock } = vi.hoisted(() => ({
  prismaMock: {
    emailMessage: { findUnique: vi.fn(), update: vi.fn() },
  },
  authMock: vi.fn(async () => ({ user: { id: 'admin-1', role: 'admin' } })),
}))

vi.mock('@/lib/auth', () => ({ auth: authMock }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/audit', () => ({ recordAudit: vi.fn(async () => undefined) }))
vi.mock('@/lib/rate-limit', () => ({ getClientIp: vi.fn(() => '127.0.0.1') }))

import { POST } from '@/app/api/admin/inbox/drop/route'

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/admin/inbox/drop', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.emailMessage.findUnique.mockResolvedValue({ id: 'e1' })
  prismaMock.emailMessage.update.mockResolvedValue({ id: 'e1', classification: 'MANUAL_DROP' })
})

describe('POST /api/admin/inbox/drop', () => {
  it('marks email as MANUAL_DROP and records audit', async () => {
    const { recordAudit } = await import('@/lib/audit')
    const res = await POST(makeReq({ emailId: 'e1' }))
    expect(res.status).toBe(200)
    expect(prismaMock.emailMessage.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'e1' },
      data: { classification: 'MANUAL_DROP' },
    }))
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'INBOX_DROP',
      resourceType: 'EmailMessage',
      resourceId: 'e1',
    }))
  })

  it('403 when not admin', async () => {
    authMock.mockResolvedValueOnce({ user: { id: 'u', role: 'investor' } })
    const res = await POST(makeReq({ emailId: 'e1' }))
    expect(res.status).toBe(403)
  })

  it('404 when email not found', async () => {
    prismaMock.emailMessage.findUnique.mockResolvedValueOnce(null)
    const res = await POST(makeReq({ emailId: 'missing' }))
    expect(res.status).toBe(404)
  })

  it('400 on missing emailId', async () => {
    const res = await POST(makeReq({}))
    expect(res.status).toBe(400)
  })
})
