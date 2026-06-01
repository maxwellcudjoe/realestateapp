import { describe, it, expect, beforeEach, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({ lead: { findUnique: vi.fn(), update: vi.fn() } }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'admin-1', role: 'admin' } })) }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/audit', () => ({ recordAudit: vi.fn(async () => undefined) }))
vi.mock('@/lib/rate-limit', () => ({ getClientIp: vi.fn(() => '127.0.0.1') }))

import { PATCH } from '@/app/api/admin/leads/[id]/route'

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/admin/leads/lead-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.lead.findUnique.mockResolvedValue({ id: 'lead-1', status: 'NEW' })
  prismaMock.lead.update.mockResolvedValue({ id: 'lead-1', status: 'QUALIFIED' })
})

describe('PATCH /api/admin/leads/[id]', () => {
  it('updates allowed fields and records LEAD_UPDATED', async () => {
    const { recordAudit } = await import('@/lib/audit')
    const res = await PATCH(makeReq({ name: 'Alice Buyer', budgetMin: 150000 }), { params: { id: 'lead-1' } })
    expect(res.status).toBe(200)
    expect(prismaMock.lead.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'lead-1' },
      data: expect.objectContaining({ name: 'Alice Buyer', budgetMin: 150000 }),
    }))
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'LEAD_UPDATED' }))
  })

  it('records LEAD_STATUS_CHANGED when status changes', async () => {
    const { recordAudit } = await import('@/lib/audit')
    await PATCH(makeReq({ status: 'QUALIFIED' }), { params: { id: 'lead-1' } })
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'LEAD_STATUS_CHANGED',
      metadata: expect.objectContaining({ from: 'NEW', to: 'QUALIFIED' }),
    }))
  })

  it('400 on invalid status', async () => {
    const res = await PATCH(makeReq({ status: 'GARBAGE' }), { params: { id: 'lead-1' } })
    expect(res.status).toBe(400)
  })

  it('404 when lead not found', async () => {
    prismaMock.lead.findUnique.mockResolvedValueOnce(null)
    const res = await PATCH(makeReq({ name: 'X' }), { params: { id: 'missing' } })
    expect(res.status).toBe(404)
  })

  it('403 when not admin', async () => {
    const { auth } = await import('@/lib/auth')
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ user: { id: 'u', role: 'investor' } })
    const res = await PATCH(makeReq({ name: 'X' }), { params: { id: 'lead-1' } })
    expect(res.status).toBe(403)
  })
})
