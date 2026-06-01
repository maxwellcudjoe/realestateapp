import { describe, it, expect, beforeEach, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({ lead: { create: vi.fn() } }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'admin-1', role: 'admin' } })) }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/audit', () => ({ recordAudit: vi.fn(async () => undefined) }))
vi.mock('@/lib/rate-limit', () => ({ getClientIp: vi.fn(() => '127.0.0.1') }))

import { POST } from '@/app/api/admin/leads/route'

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/admin/leads', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.lead.create.mockResolvedValue({ id: 'lead-1', name: 'Alice', email: 'alice@example.com' })
})

describe('POST /api/admin/leads', () => {
  it('creates a lead with valid input and records LEAD_CREATED audit', async () => {
    const { recordAudit } = await import('@/lib/audit')
    const res = await POST(makeReq({
      name: 'Alice', email: 'alice@example.com',
      sourceChannel: 'PHONE_CALL', sourceReferrer: 'Bob the partner',
      strategyCodes: ['BTL', 'HMO'], targetAreaCodes: ['LE1'],
      budgetMin: 100000, budgetMax: 250000,
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.lead.id).toBe('lead-1')
    expect(prismaMock.lead.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: 'Alice',
        email: 'alice@example.com',
        sourceChannel: 'PHONE_CALL',
        strategyCodesJson: '["BTL","HMO"]',
        targetAreaCodesJson: '["LE1"]',
      }),
    }))
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'LEAD_CREATED',
      resourceType: 'Lead',
      resourceId: 'lead-1',
    }))
  })

  it('401 when no session', async () => {
    const { auth } = await import('@/lib/auth')
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
    const res = await POST(makeReq({ name: 'A', email: 'a@b.com', sourceChannel: 'OTHER' }))
    expect(res.status).toBe(401)
  })

  it('403 when not admin', async () => {
    const { auth } = await import('@/lib/auth')
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ user: { id: 'u', role: 'investor' } })
    const res = await POST(makeReq({ name: 'A', email: 'a@b.com', sourceChannel: 'OTHER' }))
    expect(res.status).toBe(403)
  })

  it('400 when neither email nor phone provided', async () => {
    const res = await POST(makeReq({ name: 'A', sourceChannel: 'OTHER' }))
    expect(res.status).toBe(400)
  })

  it('400 on invalid source channel', async () => {
    const res = await POST(makeReq({ name: 'A', email: 'a@b.com', sourceChannel: 'TELEPATHY' }))
    expect(res.status).toBe(400)
  })

  it('400 when name is empty', async () => {
    const res = await POST(makeReq({ name: '', email: 'a@b.com', sourceChannel: 'OTHER' }))
    expect(res.status).toBe(400)
  })

  it('accepts phone-only (no email)', async () => {
    const res = await POST(makeReq({ name: 'A', phone: '+447700900111', sourceChannel: 'PHONE_CALL' }))
    expect(res.status).toBe(200)
  })
})
