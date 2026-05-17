import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: { auditEvent: { create: vi.fn() } },
}))

import { recordAudit, auditActionLabel } from '@/lib/audit'
import { prisma } from '@/lib/prisma'
const mockCreate = prisma.auditEvent.create as unknown as ReturnType<typeof vi.fn>

describe('recordAudit', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('persists a basic event', async () => {
    mockCreate.mockResolvedValue({})
    await recordAudit({
      actorUserId: 'u1', actorRole: 'admin',
      action: 'DEAL_STAGE_CHANGED', resourceType: 'Deal', resourceId: 'd1',
      metadata: { to: 'OFFER_PENDING' },
      ipAddress: '1.2.3.4',
    })
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        actorUserId: 'u1',
        actorRole: 'admin',
        action: 'DEAL_STAGE_CHANGED',
        resourceType: 'Deal',
        resourceId: 'd1',
        ipAddress: '1.2.3.4',
      }),
    }))
    expect(mockCreate.mock.calls[0][0].data.metadata).toContain('OFFER_PENDING')
  })

  it('swallows persistence errors (audit must never break the action)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCreate.mockRejectedValue(new Error('DB down'))
    await expect(
      recordAudit({ action: 'PASSWORD_CHANGED', resourceType: 'User' })
    ).resolves.toBeUndefined()
  })

  it('serializes empty metadata as null, not "{}"', async () => {
    mockCreate.mockResolvedValue({})
    await recordAudit({ action: 'PASSWORD_CHANGED', resourceType: 'User' })
    expect(mockCreate.mock.calls[0][0].data.metadata).toBeNull()
  })
})

describe('auditActionLabel', () => {
  it('returns the friendly label for known actions', () => {
    expect(auditActionLabel('DEAL_STAGE_CHANGED')).toBe('Deal stage changed')
  })
  it('falls back to the raw code for unknown actions', () => {
    expect(auditActionLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW')
  })
})
