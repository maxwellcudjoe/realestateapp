import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockTransaction = vi.fn()
const mockFindUnique = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mockFindUnique },
    $transaction: mockTransaction,
  },
}))

vi.mock('@/lib/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'mock-id' }),
}))

vi.mock('@/lib/password', () => ({
  checkPasswordBreached: vi.fn().mockResolvedValue({ pwned: false, count: 0 }),
}))

vi.mock('@/lib/turnstile', () => ({
  verifyTurnstile: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ ok: true, remaining: 4, resetAt: Date.now() + 60000 }),
  getClientIp: vi.fn().mockReturnValue('1.2.3.4'),
}))

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('$2a$12$hashed') },
}))

async function getHandler() {
  const mod = await import('@/app/api/onboarding/route')
  return mod.POST
}

const VALID_BODY = {
  email: 'jane@example.com',
  password: 'Securepass1!',
  firstName: 'Jane',
  lastName: 'Smith',
  phone: '+447700000000',
  addressLine1: '123 Main St',
  city: 'London',
  postcode: 'E1 6AN',
  budgetMin: 100000,
  budgetMax: 300000,
  strategy: 'BTL',
  buyerType: 'cash',
  targetAreas: 'Manchester, Leeds',
  dateOfBirth: '1990-01-01',
  nationality: 'GB',
  taxResidency: 'GB',
  niNumber: 'AB123456C',
  isPep: false,
  pepDetails: '',
  sourceOfFunds: 'SAVINGS',
  sourceOfFundsDetail: '',
  agreedToTerms: true,
  agreedToPrivacy: true,
  agreedToAccuracy: true,
  agreedToAge: true,
}

describe('POST /api/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUnique.mockResolvedValue(null)
    mockTransaction.mockImplementation(async (fn: any) => {
      const txMock = {
        user: { create: vi.fn().mockResolvedValue({ id: 'u1', email: 'jane@example.com' }) },
        investorProfile: { create: vi.fn().mockResolvedValue({ id: 'p1' }) },
        application: { create: vi.fn().mockResolvedValue({ id: 'a1' }) },
        statusHistory: { create: vi.fn().mockResolvedValue({ id: 's1' }) },
        emailVerificationToken: { create: vi.fn().mockResolvedValue({ id: 'v1' }) },
      }
      return fn(txMock)
    })
  })

  it('returns 200 with valid data', async () => {
    const POST = await getHandler()
    const req = new Request('http://localhost/api/onboarding', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('returns 422 with validation errors for invalid data', async () => {
    const POST = await getHandler()
    const req = new Request('http://localhost/api/onboarding', {
      method: 'POST',
      body: JSON.stringify({ email: 'not-an-email' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(422)
  })

  it('returns 422 if email already exists', async () => {
    mockFindUnique.mockResolvedValue({ id: 'existing-user' })
    const POST = await getHandler()
    const req = new Request('http://localhost/api/onboarding', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req as any)
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.errors.email).toBeDefined()
  })
})
