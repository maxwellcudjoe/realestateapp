import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockSignOut = vi.fn().mockResolvedValue(undefined)
const mockFindUnique = vi.fn()
const mockTransaction = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth, signOut: mockSignOut }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mockFindUnique },
    $transaction: mockTransaction,
  },
}))

async function getHandler() {
  const mod = await import('@/app/api/portal/account/delete/route')
  return mod.POST
}

const req = (body: any) =>
  new Request('http://localhost/api/portal/account/delete', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any

describe('POST /api/portal/account/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    mockTransaction.mockImplementation(async (fn: any) => fn({
      user: { update: vi.fn() },
      investorProfile: { update: vi.fn() },
      passwordResetToken: { deleteMany: vi.fn() },
      emailVerificationToken: { deleteMany: vi.fn() },
      recoveryCode: { deleteMany: vi.fn() },
    }))
  })

  it('rejects unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const POST = await getHandler()
    const res = await POST(req({ password: 'x', confirm: 'DELETE' }))
    expect(res.status).toBe(401)
  })

  it('rejects when confirm is not DELETE', async () => {
    const POST = await getHandler()
    const res = await POST(req({ password: 'x', confirm: 'delete' }))
    expect(res.status).toBe(400)
  })

  it('refuses to self-delete admin accounts', async () => {
    mockFindUnique.mockResolvedValue({ id: 'u1', role: 'admin', passwordHash: '$2a$10$x', investorProfile: null })
    const POST = await getHandler()
    const res = await POST(req({ password: 'x', confirm: 'DELETE' }))
    expect(res.status).toBe(403)
  })

  it('rejects when password does not match', async () => {
    mockFindUnique.mockResolvedValue({ id: 'u1', role: 'investor', passwordHash: '$2a$10$wrong-hash', investorProfile: null })
    const POST = await getHandler()
    const res = await POST(req({ password: 'wrong', confirm: 'DELETE' }))
    expect(res.status).toBe(400)
    expect(mockTransaction).not.toHaveBeenCalled()
  })
})

describe('GET /api/portal/data-export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
  })

  it('returns 401 without session', async () => {
    mockAuth.mockResolvedValue(null)
    const mod = await import('@/app/api/portal/data-export/route')
    const res = await mod.GET()
    expect(res.status).toBe(401)
  })

  it('returns 404 if user record missing', async () => {
    mockFindUnique.mockResolvedValue(null)
    const mod = await import('@/app/api/portal/data-export/route')
    const res = await mod.GET()
    expect(res.status).toBe(404)
  })

  it('returns a JSON download for an existing user', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'u1', email: 'jane@example.com', role: 'investor', emailVerifiedAt: new Date(),
      totpEnabledAt: null, createdAt: new Date(),
      investorProfile: { firstName: 'Jane', lastName: 'Smith', phone: '+447700000000',
        addressLine1: '1 Main', city: 'London', postcode: 'E1 6AN',
        dateOfBirth: new Date(), nationality: 'GB', taxResidency: 'GB',
        niNumber: 'AB123456C', isPep: false, pepDetails: null,
        sourceOfFunds: 'SAVINGS', sourceOfFundsDetail: null,
        budgetMin: 100000, budgetMax: 300000, strategies: [{ strategy: 'BTL' }],
        buyerType: 'cash', structuredAreas: [{ code: 'manchester', label: 'Manchester (M)' }],
        experienceLevel: 'OWN_1_3', timelineToBuy: 'M_1_3',
        mortgageStatus: null, mortgageLender: null, maxLtv: null, depositAvailable: null,
        referralSource: null, entityType: 'INDIVIDUAL',
        companyName: null, companyNumber: null, vatNumber: null,
        marketingConsentAt: null,
        application: { id: 'a1', status: 'SUBMITTED', createdAt: new Date(),
          statusHistory: [], documents: [], messages: [], deals: [] },
      },
      loginAttempts: [],
    })
    const mod = await import('@/app/api/portal/data-export/route')
    const res = await mod.GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Disposition')).toContain('attachment')
    expect(res.headers.get('Content-Type')).toBe('application/json')
  })
})
