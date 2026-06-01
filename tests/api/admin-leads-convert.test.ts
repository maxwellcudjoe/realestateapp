import { describe, it, expect, beforeEach, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  lead: { findUnique: vi.fn() },
  leadConversionToken: { create: vi.fn() },
}))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'admin-1', role: 'admin' } })) }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/audit', () => ({ recordAudit: vi.fn(async () => undefined) }))
vi.mock('@/lib/rate-limit', () => ({ getClientIp: vi.fn(() => '127.0.0.1') }))
vi.mock('@/lib/resend', () => ({ sendEmail: vi.fn(async () => ({ id: 'msg-1' })) }))

import { POST } from '@/app/api/admin/leads/[id]/convert/route'

function makeReq(body: unknown = {}): Request {
  return new Request('http://localhost/api/admin/leads/lead-1/convert', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', host: 'www.revebatir.co.uk' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXTAUTH_URL = 'https://www.revebatir.co.uk'
  prismaMock.lead.findUnique.mockResolvedValue({
    id: 'lead-1', name: 'Alice', email: 'alice@example.com', convertedUserId: null,
  })
  prismaMock.leadConversionToken.create.mockImplementation(async ({ data }) => ({
    id: 'tok-1',
    token: data.token,
    expiresAt: data.expiresAt,
  }))
})

describe('POST /api/admin/leads/[id]/convert', () => {
  it('creates a token, emails the lead, returns the magic-link URL', async () => {
    const { sendEmail } = await import('@/lib/resend')
    const res = await POST(makeReq({ adminMessage: 'Great chatting earlier!' }), { params: { id: 'lead-1' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.magicLinkUrl).toContain('/auth/finish-setup?token=')
    expect(prismaMock.leadConversionToken.create).toHaveBeenCalled()
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'alice@example.com',
      subject: expect.stringContaining('Rêve Bâtir'),
    }))
  })

  it('400 when lead has no email', async () => {
    prismaMock.lead.findUnique.mockResolvedValueOnce({ id: 'lead-1', name: 'A', email: null, convertedUserId: null })
    const res = await POST(makeReq(), { params: { id: 'lead-1' } })
    expect(res.status).toBe(400)
  })

  it('409 when lead already converted', async () => {
    prismaMock.lead.findUnique.mockResolvedValueOnce({ id: 'lead-1', name: 'A', email: 'a@b.com', convertedUserId: 'user-x' })
    const res = await POST(makeReq(), { params: { id: 'lead-1' } })
    expect(res.status).toBe(409)
  })

  it('404 when lead not found', async () => {
    prismaMock.lead.findUnique.mockResolvedValueOnce(null)
    const res = await POST(makeReq(), { params: { id: 'missing' } })
    expect(res.status).toBe(404)
  })

  it('403 when not admin', async () => {
    const { auth } = await import('@/lib/auth')
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ user: { id: 'u', role: 'investor' } })
    const res = await POST(makeReq(), { params: { id: 'lead-1' } })
    expect(res.status).toBe(403)
  })

  it('records LEAD_CONVERT_INITIATED audit', async () => {
    const { recordAudit } = await import('@/lib/audit')
    await POST(makeReq(), { params: { id: 'lead-1' } })
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'LEAD_CONVERT_INITIATED' }))
  })
})
