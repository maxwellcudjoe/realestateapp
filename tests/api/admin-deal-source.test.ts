import { describe, it, expect, beforeEach, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  deal: { create: vi.fn() },
  application: { findUnique: vi.fn() },
  lead: { findUnique: vi.fn() },
  dealerContact: { findUnique: vi.fn() },
}))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'admin-1', role: 'admin' } })) }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/audit', () => ({ recordAudit: vi.fn(async () => undefined) }))
vi.mock('@/lib/rate-limit', () => ({ getClientIp: vi.fn(() => '127.0.0.1') }))
vi.mock('@/lib/resend', () => ({ sendEmail: vi.fn(async () => undefined) }))

import { POST } from '@/app/api/admin/investors/[id]/deals/route'

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/admin/investors/app-1/deals', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

const baseBody = {
  title: 'Test deal',
  address: '1 Test Street, Birmingham',
  askingPrice: 185000,
  summary: 'Two-bed',
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.application.findUnique.mockResolvedValue({
    id: 'app-1',
    investorProfile: { firstName: 'Alice', user: { email: 'alice@example.com' } },
  })
  prismaMock.deal.create.mockResolvedValue({ id: 'deal-1' })
  prismaMock.lead.findUnique.mockResolvedValue({ id: 'lead-1' })
  prismaMock.dealerContact.findUnique.mockResolvedValue({ id: 'contact-1' })
})

describe('POST /api/admin/investors/[id]/deals — source attribution', () => {
  it('persists source fields when provided', async () => {
    const res = await POST(makeReq({
      ...baseBody,
      sourceChannel: 'AGENT_EMAIL',
      sourceLeadId: 'lead-1',
      sourceContactId: 'contact-1',
      sourceNote: 'Sourced via Birmingham agent',
    }) as any, { params: { id: 'app-1' } })
    expect(res.status).toBe(200)
    expect(prismaMock.deal.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        sourceChannel: 'AGENT_EMAIL',
        sourceLeadId: 'lead-1',
        sourceContactId: 'contact-1',
        sourceNote: 'Sourced via Birmingham agent',
      }),
    }))
  })

  it('records DEAL_SOURCE_ATTRIBUTED audit when any source field is set', async () => {
    const { recordAudit } = await import('@/lib/audit')
    await POST(makeReq({
      ...baseBody,
      sourceChannel: 'SOURCER',
    }) as any, { params: { id: 'app-1' } })
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'DEAL_SOURCE_ATTRIBUTED',
      resourceType: 'Deal',
      resourceId: 'deal-1',
    }))
  })

  it('400 when sourceLeadId references a missing Lead', async () => {
    prismaMock.lead.findUnique.mockResolvedValueOnce(null)
    const res = await POST(makeReq({
      ...baseBody,
      sourceLeadId: 'missing-lead',
    }) as any, { params: { id: 'app-1' } })
    expect(res.status).toBe(400)
    expect(prismaMock.deal.create).not.toHaveBeenCalled()
  })

  it('400 when sourceContactId references a missing DealerContact', async () => {
    prismaMock.dealerContact.findUnique.mockResolvedValueOnce(null)
    const res = await POST(makeReq({
      ...baseBody,
      sourceContactId: 'missing-contact',
    }) as any, { params: { id: 'app-1' } })
    expect(res.status).toBe(400)
    expect(prismaMock.deal.create).not.toHaveBeenCalled()
  })

  it('backwards-compatible: deal without source fields still works and no source audit', async () => {
    const { recordAudit } = await import('@/lib/audit')
    const res = await POST(makeReq(baseBody) as any, { params: { id: 'app-1' } })
    expect(res.status).toBe(200)
    expect(prismaMock.deal.create).toHaveBeenCalled()
    const sourceAuditCalls = (recordAudit as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c) => c[0]?.action === 'DEAL_SOURCE_ATTRIBUTED',
    )
    expect(sourceAuditCalls).toHaveLength(0)
  })
})
