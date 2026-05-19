import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockAppFindUnique = vi.fn()
const mockKycCheckCreate = vi.fn()
const mockAuditCreate = vi.fn()
const mockSendEmail = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/resend', () => ({ sendEmail: mockSendEmail }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    application: { findUnique: mockAppFindUnique },
    kycCheck: { create: mockKycCheckCreate },
    auditEvent: { create: mockAuditCreate },
  },
}))

async function getHandler() {
  const mod = await import('@/app/api/admin/applications/[id]/kyc-recheck/route')
  return mod.POST
}

function makeRequest() {
  return new Request('http://localhost/test', { method: 'POST' }) as any
}

beforeEach(() => {
  vi.clearAllMocks()
  mockKycCheckCreate.mockResolvedValue({ id: 'kyc1' })
  mockAuditCreate.mockResolvedValue({ id: 'a1' })
  mockSendEmail.mockResolvedValue({ id: 'em1' })
  delete process.env.SUMSUB_APP_TOKEN
  delete process.env.SUMSUB_SECRET_KEY
})

describe('POST /api/admin/applications/[id]/kyc-recheck', () => {
  it('401 unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const POST = await getHandler()
    const res = await POST(makeRequest(), { params: { id: 'app1' } })
    expect(res.status).toBe(401)
  })

  it('403 non-admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    const POST = await getHandler()
    const res = await POST(makeRequest(), { params: { id: 'app1' } })
    expect(res.status).toBe(403)
  })

  it('404 application not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin1', role: 'admin' } })
    mockAppFindUnique.mockResolvedValue(null)
    const POST = await getHandler()
    const res = await POST(makeRequest(), { params: { id: 'missing' } })
    expect(res.status).toBe(404)
  })

  it('200 falls back to MANUAL when SumSub env unset', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin1', role: 'admin' } })
    mockAppFindUnique.mockResolvedValue({
      id: 'app1',
      investorProfile: { firstName: 'Jane', user: { id: 'u1', email: 'jane@ex.com' } },
    })
    const POST = await getHandler()
    const res = await POST(makeRequest(), { params: { id: 'app1' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.provider).toBe('MANUAL')
    expect(mockKycCheckCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ provider: 'MANUAL', status: 'PENDING' }),
    }))
  })

  it('200 uses SUMSUB when both env vars set', async () => {
    process.env.SUMSUB_APP_TOKEN = 'tok'
    process.env.SUMSUB_SECRET_KEY = 'sec'
    mockAuth.mockResolvedValue({ user: { id: 'admin1', role: 'admin' } })
    mockAppFindUnique.mockResolvedValue({
      id: 'app1',
      investorProfile: { firstName: 'Jane', user: { id: 'u1', email: 'jane@ex.com' } },
    })
    const POST = await getHandler()
    const res = await POST(makeRequest(), { params: { id: 'app1' } })
    const json = await res.json()
    expect(json.provider).toBe('SUMSUB')
  })

  it('writes audit + sends email', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin1', role: 'admin' } })
    mockAppFindUnique.mockResolvedValue({
      id: 'app1',
      investorProfile: { firstName: 'Jane', user: { id: 'u1', email: 'jane@ex.com' } },
    })
    const POST = await getHandler()
    await POST(makeRequest(), { params: { id: 'app1' } })
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'jane@ex.com',
    }))
    expect(mockAuditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'KYC_RECHECK_LAUNCHED' }),
    }))
  })

  it('returns 200 even if email send throws', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin1', role: 'admin' } })
    mockAppFindUnique.mockResolvedValue({
      id: 'app1',
      investorProfile: { firstName: 'Jane', user: { id: 'u1', email: 'jane@ex.com' } },
    })
    mockSendEmail.mockRejectedValueOnce(new Error('SMTP down'))
    const POST = await getHandler()
    const res = await POST(makeRequest(), { params: { id: 'app1' } })
    expect(res.status).toBe(200)
  })
})
