import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockUserFindMany = vi.fn()
const mockUserFindUnique = vi.fn()
const mockUserUpdate = vi.fn()
const mockProfileUpdate = vi.fn()
const mockTokenDeleteMany = vi.fn()
const mockAuditCreate = vi.fn()
const mockTransaction = vi.fn(async (fn: any) => {
  // Simulate the txn callback receiving a tx-bound prisma
  return fn({
    user: { update: mockUserUpdate },
    investorProfile: { update: mockProfileUpdate },
    passwordResetToken: { deleteMany: mockTokenDeleteMany },
    emailVerificationToken: { deleteMany: mockTokenDeleteMany },
    recoveryCode: { deleteMany: mockTokenDeleteMany },
  })
})

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findMany: mockUserFindMany, findUnique: mockUserFindUnique, update: mockUserUpdate },
    investorProfile: { update: mockProfileUpdate },
    passwordResetToken: { deleteMany: mockTokenDeleteMany },
    emailVerificationToken: { deleteMany: mockTokenDeleteMany },
    recoveryCode: { deleteMany: mockTokenDeleteMany },
    auditEvent: { create: mockAuditCreate },
    $transaction: (fn: any) => mockTransaction(fn),
  },
}))

async function getHandler() {
  const mod = await import('@/app/api/admin/users/anonymise-expired/route')
  return mod.POST
}

function makeRequest(url: string, headers?: Record<string, string>) {
  return new Request(`http://localhost${url}`, {
    method: 'POST',
    headers,
  }) as any
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUserUpdate.mockResolvedValue({ id: 'u1' })
  mockProfileUpdate.mockResolvedValue({ id: 'p1' })
  mockTokenDeleteMany.mockResolvedValue({ count: 0 })
  mockAuditCreate.mockResolvedValue({ id: 'a1' })
  process.env.CRON_SECRET = 'test-secret'
})

describe('POST /api/admin/users/anonymise-expired', () => {
  it('401 without auth and without bearer', async () => {
    mockAuth.mockResolvedValue(null)
    const POST = await getHandler()
    const res = await POST(makeRequest('/api/admin/users/anonymise-expired'))
    expect(res.status).toBe(401)
  })

  it('403 for non-admin without bearer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    const POST = await getHandler()
    const res = await POST(makeRequest('/api/admin/users/anonymise-expired'))
    expect(res.status).toBe(403)
  })

  it('accepts Bearer CRON_SECRET', async () => {
    mockUserFindMany.mockResolvedValue([])
    const POST = await getHandler()
    const res = await POST(makeRequest('/api/admin/users/anonymise-expired', {
      authorization: 'Bearer test-secret',
    }))
    expect(res.status).toBe(200)
  })

  it('dryRun=true returns candidates without mutating', async () => {
    mockUserFindMany.mockResolvedValue([
      { id: 'u1', email: '[deleted]@x.com', deletedAt: new Date('2026-04-01') },
      { id: 'u2', email: '[deleted2]@x.com', deletedAt: new Date('2026-04-02') },
    ])
    const POST = await getHandler()
    const res = await POST(makeRequest('/api/admin/users/anonymise-expired?dryRun=true', {
      authorization: 'Bearer test-secret',
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.mode).toBe('dryRun')
    expect(json.candidateCount).toBe(2)
    expect(json.candidates).toHaveLength(2)
    expect(mockTransaction).not.toHaveBeenCalled()
    expect(mockAuditCreate).not.toHaveBeenCalled()
  })

  it('processes each candidate and writes USER_ANONYMISED + ANONYMISATION_RUN audits', async () => {
    mockUserFindMany.mockResolvedValue([
      { id: 'u1', email: '[deleted]@x.com', deletedAt: new Date('2026-04-01') },
    ])
    mockUserFindUnique.mockResolvedValue({
      id: 'u1', deletedAt: new Date('2026-04-01'), anonymisedAt: null, investorProfile: { id: 'p1' },
    })
    const POST = await getHandler()
    const res = await POST(makeRequest('/api/admin/users/anonymise-expired', {
      authorization: 'Bearer test-secret',
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.mode).toBe('run')
    expect(json.processed).toBe(1)
    expect(json.successful).toBe(1)
    expect(mockTransaction).toHaveBeenCalled()

    const auditActions = mockAuditCreate.mock.calls.map((c) => c[0].data.action)
    expect(auditActions).toContain('USER_ANONYMISED')
    expect(auditActions).toContain('ANONYMISATION_RUN')
  })

  it('uses graceDays query param', async () => {
    mockUserFindMany.mockResolvedValue([])
    const POST = await getHandler()
    await POST(makeRequest('/api/admin/users/anonymise-expired?graceDays=7', {
      authorization: 'Bearer test-secret',
    }))
    const where = mockUserFindMany.mock.calls[0][0].where
    expect(where.deletedAt.lt).toBeInstanceOf(Date)
    // The cutoff should be ~7 days ago, not 30
    const cutoffMs = where.deletedAt.lt.getTime()
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    expect(Math.abs(cutoffMs - sevenDaysAgo)).toBeLessThan(60_000)
  })

  it('continues if one user fails', async () => {
    mockUserFindMany.mockResolvedValue([
      { id: 'u1', email: '[d1]@x.com', deletedAt: new Date('2026-04-01') },
      { id: 'u2', email: '[d2]@x.com', deletedAt: new Date('2026-04-02') },
    ])
    mockUserFindUnique
      .mockResolvedValueOnce({ id: 'u1', deletedAt: new Date(), anonymisedAt: null, investorProfile: null })
      .mockResolvedValueOnce({ id: 'u2', deletedAt: new Date(), anonymisedAt: null, investorProfile: null })
    mockTransaction
      .mockImplementationOnce(async () => { throw new Error('db down') })
      .mockImplementationOnce(async (fn: any) => fn({
        user: { update: mockUserUpdate },
        investorProfile: { update: mockProfileUpdate },
        passwordResetToken: { deleteMany: mockTokenDeleteMany },
        emailVerificationToken: { deleteMany: mockTokenDeleteMany },
        recoveryCode: { deleteMany: mockTokenDeleteMany },
      }))
    const POST = await getHandler()
    const res = await POST(makeRequest('/api/admin/users/anonymise-expired', {
      authorization: 'Bearer test-secret',
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.processed).toBe(2)
    expect(json.successful).toBe(1)
    expect(json.errors).toBe(1)
  })
})
