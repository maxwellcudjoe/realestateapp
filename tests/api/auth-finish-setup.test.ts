import { describe, it, expect, beforeEach, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  leadConversionToken: { findUnique: vi.fn(), update: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/leads/convert', () => ({
  convertLead: vi.fn(async () => ({ userId: 'user-new', applicationId: 'app-new', email: 'alice@example.com', fromAutoMatch: false })),
}))
vi.mock('@/lib/password', () => ({ checkPasswordBreached: vi.fn(async () => ({ pwned: false, count: 0 })) }))
vi.mock('@/lib/auth', () => ({ signIn: vi.fn(async () => undefined) }))

import { POST } from '@/app/api/auth/finish-setup/route'

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/auth/finish-setup', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

const validBody = { token: 'TESTTOKEN', password: 'StrongPassw0rd!', gdprConsent: true }

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.leadConversionToken.findUnique.mockResolvedValue({
    id: 'tok-1', leadId: 'lead-1', token: 'TESTTOKEN',
    expiresAt: new Date(Date.now() + 3_600_000), usedAt: null,
  })
  prismaMock.leadConversionToken.update.mockResolvedValue({ id: 'tok-1' })
})

describe('POST /api/auth/finish-setup', () => {
  it('redeems token, calls convertLead, marks token used', async () => {
    const { convertLead } = await import('@/lib/leads/convert')
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(200)
    expect(convertLead).toHaveBeenCalledWith('lead-1', expect.objectContaining({
      password: 'StrongPassw0rd!',
      consents: { gdpr: true },
    }))
    expect(prismaMock.leadConversionToken.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'tok-1' },
      data: expect.objectContaining({ usedAt: expect.any(Date) }),
    }))
  })

  it('410 when token already used', async () => {
    prismaMock.leadConversionToken.findUnique.mockResolvedValueOnce({
      id: 'tok-1', leadId: 'lead-1', token: 'TESTTOKEN',
      expiresAt: new Date(Date.now() + 3_600_000),
      usedAt: new Date(Date.now() - 60_000),
    })
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(410)
  })

  it('410 when token expired', async () => {
    prismaMock.leadConversionToken.findUnique.mockResolvedValueOnce({
      id: 'tok-1', leadId: 'lead-1', token: 'TESTTOKEN',
      expiresAt: new Date(Date.now() - 60_000), usedAt: null,
    })
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(410)
  })

  it('404 when token not found', async () => {
    prismaMock.leadConversionToken.findUnique.mockResolvedValueOnce(null)
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(404)
  })

  it('400 on weak password (< 12 chars)', async () => {
    const res = await POST(makeReq({ ...validBody, password: 'short' }))
    expect(res.status).toBe(400)
  })

  it('400 on missing GDPR consent', async () => {
    const res = await POST(makeReq({ ...validBody, gdprConsent: false }))
    expect(res.status).toBe(400)
  })

  it('400 on HIBP breached password', async () => {
    const { checkPasswordBreached } = await import('@/lib/password')
    ;(checkPasswordBreached as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ pwned: true, count: 42 })
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(400)
  })

  it('attempts auto-sign-in with the new credentials on success', async () => {
    const { signIn } = await import('@/lib/auth')
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(200)
    expect(signIn).toHaveBeenCalledWith('credentials', expect.objectContaining({
      email: 'alice@example.com',
      password: 'StrongPassw0rd!',
      redirect: false,
    }))
  })

  it('still returns 200 when auto-sign-in throws (non-fatal)', async () => {
    const { signIn } = await import('@/lib/auth')
    ;(signIn as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('credentials rejected'))
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(200)
  })
})
