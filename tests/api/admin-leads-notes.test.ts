import { describe, it, expect, beforeEach, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  lead: { findUnique: vi.fn() },
  leadNote: { create: vi.fn() },
}))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'admin-1', role: 'admin' } })) }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/audit', () => ({ recordAudit: vi.fn(async () => undefined) }))
vi.mock('@/lib/rate-limit', () => ({ getClientIp: vi.fn(() => '127.0.0.1') }))

import { POST } from '@/app/api/admin/leads/[id]/notes/route'

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/admin/leads/lead-1/notes', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.lead.findUnique.mockResolvedValue({ id: 'lead-1' })
  prismaMock.leadNote.create.mockResolvedValue({ id: 'note-1', body: 'Spoke today', createdAt: new Date() })
})

describe('POST /api/admin/leads/[id]/notes', () => {
  it('appends a note and records LEAD_NOTE_ADDED', async () => {
    const { recordAudit } = await import('@/lib/audit')
    const res = await POST(makeReq({ body: 'Spoke today, very interested' }), { params: { id: 'lead-1' } })
    expect(res.status).toBe(200)
    expect(prismaMock.leadNote.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        leadId: 'lead-1',
        authorUserId: 'admin-1',
        body: 'Spoke today, very interested',
      }),
    }))
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'LEAD_NOTE_ADDED' }))
  })

  it('400 on empty body', async () => {
    const res = await POST(makeReq({ body: '' }), { params: { id: 'lead-1' } })
    expect(res.status).toBe(400)
  })

  it('404 when lead not found', async () => {
    prismaMock.lead.findUnique.mockResolvedValueOnce(null)
    const res = await POST(makeReq({ body: 'x' }), { params: { id: 'missing' } })
    expect(res.status).toBe(404)
  })
})
