import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockUserFindUnique = vi.fn()
const mockUserUpdate = vi.fn()
const mockEmailTokenUpdateMany = vi.fn()
const mockEmailTokenCreate = vi.fn()
const mockResetTokenUpdateMany = vi.fn()
const mockResetTokenCreate = vi.fn()
const mockRecoveryDeleteMany = vi.fn()
const mockAuditCreate = vi.fn()
const mockSendEmail = vi.fn()
const mockTransaction = vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops))

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/resend', () => ({ sendEmail: mockSendEmail }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
    emailVerificationToken: { updateMany: mockEmailTokenUpdateMany, create: mockEmailTokenCreate },
    passwordResetToken: { updateMany: mockResetTokenUpdateMany, create: mockResetTokenCreate },
    recoveryCode: { deleteMany: mockRecoveryDeleteMany },
    auditEvent: { create: mockAuditCreate },
    $transaction: (ops: Promise<unknown>[]) => mockTransaction(ops),
  },
}))

function adminSession() {
  return { user: { id: 'admin1', role: 'admin' } }
}

function makeRequest(body: unknown = null) {
  return new Request('http://localhost/test', {
    method: 'POST',
    headers: body !== null ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== null ? JSON.stringify(body) : undefined,
  }) as any
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSendEmail.mockResolvedValue({ id: 'em1' })
  mockEmailTokenUpdateMany.mockResolvedValue({ count: 0 })
  mockEmailTokenCreate.mockResolvedValue({ id: 't1' })
  mockResetTokenUpdateMany.mockResolvedValue({ count: 0 })
  mockResetTokenCreate.mockResolvedValue({ id: 't1' })
  mockRecoveryDeleteMany.mockResolvedValue({ count: 0 })
  mockAuditCreate.mockResolvedValue({ id: 'a1' })
  mockUserUpdate.mockResolvedValue({ id: 'u1' })
})

describe('POST /api/admin/users/[userId]/resend-verification', () => {
  async function getHandler() {
    const mod = await import('@/app/api/admin/users/[userId]/resend-verification/route')
    return mod.POST
  }

  it('401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const POST = await getHandler()
    const res = await POST(makeRequest(), { params: { userId: 'u1' } })
    expect(res.status).toBe(401)
  })

  it('403 when not admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    const POST = await getHandler()
    const res = await POST(makeRequest(), { params: { userId: 'u1' } })
    expect(res.status).toBe(403)
  })

  it('404 when user not found', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockUserFindUnique.mockResolvedValue(null)
    const POST = await getHandler()
    const res = await POST(makeRequest(), { params: { userId: 'u1' } })
    expect(res.status).toBe(404)
  })

  it('409 when email already verified', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockUserFindUnique.mockResolvedValue({ id: 'u1', email: 'a@b.c', emailVerifiedAt: new Date(), investorProfile: null })
    const POST = await getHandler()
    const res = await POST(makeRequest(), { params: { userId: 'u1' } })
    expect(res.status).toBe(409)
  })

  it('200 + creates token + sends email + writes audit', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockUserFindUnique.mockResolvedValue({
      id: 'u1', email: 'a@b.c', emailVerifiedAt: null,
      investorProfile: { firstName: 'Jane' },
    })
    const POST = await getHandler()
    const res = await POST(makeRequest(), { params: { userId: 'u1' } })
    expect(res.status).toBe(200)
    expect(mockEmailTokenUpdateMany).toHaveBeenCalled()
    expect(mockEmailTokenCreate).toHaveBeenCalled()
    expect(mockSendEmail).toHaveBeenCalled()
    expect(mockAuditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'VERIFICATION_RESENT', resourceId: 'u1' }),
    }))
  })
})

describe('POST /api/admin/users/[userId]/disable-2fa', () => {
  async function getHandler() {
    const mod = await import('@/app/api/admin/users/[userId]/disable-2fa/route')
    return mod.POST
  }

  it('400 when reason missing', async () => {
    mockAuth.mockResolvedValue(adminSession())
    const POST = await getHandler()
    const res = await POST(makeRequest({}), { params: { userId: 'u1' } })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('REASON_REQUIRED')
  })

  it('400 when reason too short', async () => {
    mockAuth.mockResolvedValue(adminSession())
    const POST = await getHandler()
    const res = await POST(makeRequest({ reason: 'x' }), { params: { userId: 'u1' } })
    expect(res.status).toBe(400)
  })

  it('409 when 2FA not enabled', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockUserFindUnique.mockResolvedValue({ id: 'u1', totpEnabledAt: null })
    const POST = await getHandler()
    const res = await POST(makeRequest({ reason: 'lockout support' }), { params: { userId: 'u1' } })
    expect(res.status).toBe(409)
  })

  it('200 clears TOTP + recovery codes + writes audit with reason metadata', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockUserFindUnique.mockResolvedValue({ id: 'u1', totpEnabledAt: new Date(), totpSecret: 'abc' })
    const POST = await getHandler()
    const res = await POST(makeRequest({ reason: 'investor lost device' }), { params: { userId: 'u1' } })
    expect(res.status).toBe(200)
    expect(mockTransaction).toHaveBeenCalled()
    expect(mockAuditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'TWOFA_DISABLED_BY_ADMIN',
        metadata: expect.stringContaining('investor lost device'),
      }),
    }))
  })
})

describe('POST /api/admin/users/[userId]/force-password-reset', () => {
  async function getHandler() {
    const mod = await import('@/app/api/admin/users/[userId]/force-password-reset/route')
    return mod.POST
  }

  it('404 when user not found', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockUserFindUnique.mockResolvedValue(null)
    const POST = await getHandler()
    const res = await POST(makeRequest(), { params: { userId: 'u1' } })
    expect(res.status).toBe(404)
  })

  it('200 issues reset token + email + audit', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockUserFindUnique.mockResolvedValue({ id: 'u1', email: 'a@b.c' })
    const POST = await getHandler()
    const res = await POST(makeRequest(), { params: { userId: 'u1' } })
    expect(res.status).toBe(200)
    expect(mockResetTokenUpdateMany).toHaveBeenCalled()
    expect(mockResetTokenCreate).toHaveBeenCalled()
    expect(mockSendEmail).toHaveBeenCalled()
    expect(mockAuditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'PASSWORD_RESET_FORCED' }),
    }))
  })
})

describe('POST /api/admin/users/[userId]/soft-delete', () => {
  async function getHandler() {
    const mod = await import('@/app/api/admin/users/[userId]/soft-delete/route')
    return mod.POST
  }

  it('400 when reason missing', async () => {
    mockAuth.mockResolvedValue(adminSession())
    const POST = await getHandler()
    const res = await POST(makeRequest({}), { params: { userId: 'u1' } })
    expect(res.status).toBe(400)
  })

  it('400 when target is self', async () => {
    mockAuth.mockResolvedValue(adminSession())
    const POST = await getHandler()
    const res = await POST(makeRequest({ reason: 'leaving' }), { params: { userId: 'admin1' } })
    expect(res.status).toBe(400)
  })

  it('400 when target is admin', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockUserFindUnique.mockResolvedValue({ id: 'admin2', role: 'admin', deletedAt: null })
    const POST = await getHandler()
    const res = await POST(makeRequest({ reason: 'cleanup' }), { params: { userId: 'admin2' } })
    expect(res.status).toBe(400)
  })

  it('409 when already soft-deleted', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockUserFindUnique.mockResolvedValue({ id: 'u1', role: 'investor', deletedAt: new Date() })
    const POST = await getHandler()
    const res = await POST(makeRequest({ reason: 'requested' }), { params: { userId: 'u1' } })
    expect(res.status).toBe(409)
  })

  it('200 sets deletedAt + deletionReason + audits', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockUserFindUnique.mockResolvedValue({ id: 'u1', role: 'investor', deletedAt: null })
    const POST = await getHandler()
    const res = await POST(makeRequest({ reason: 'gdpr-erasure' }), { params: { userId: 'u1' } })
    expect(res.status).toBe(200)
    expect(mockUserUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ deletionReason: 'gdpr-erasure' }),
    }))
    expect(mockAuditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'USER_SOFT_DELETED',
        metadata: expect.stringContaining('gdpr-erasure'),
      }),
    }))
  })
})

describe('POST /api/admin/users/[userId]/restore', () => {
  async function getHandler() {
    const mod = await import('@/app/api/admin/users/[userId]/restore/route')
    return mod.POST
  }

  it('409 when not soft-deleted', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockUserFindUnique.mockResolvedValue({ id: 'u1', deletedAt: null, anonymisedAt: null })
    const POST = await getHandler()
    const res = await POST(makeRequest(), { params: { userId: 'u1' } })
    expect(res.status).toBe(409)
  })

  it('410 when anonymised', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockUserFindUnique.mockResolvedValue({ id: 'u1', deletedAt: new Date(), anonymisedAt: new Date() })
    const POST = await getHandler()
    const res = await POST(makeRequest(), { params: { userId: 'u1' } })
    expect(res.status).toBe(410)
  })

  it('200 clears deletedAt + audits', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockUserFindUnique.mockResolvedValue({ id: 'u1', deletedAt: new Date(), anonymisedAt: null })
    const POST = await getHandler()
    const res = await POST(makeRequest(), { params: { userId: 'u1' } })
    expect(res.status).toBe(200)
    expect(mockUserUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: { deletedAt: null, deletionReason: null },
    }))
    expect(mockAuditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'USER_RESTORED' }),
    }))
  })
})
