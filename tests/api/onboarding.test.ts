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

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('$2a$12$hashed') },
}))

async function getHandler() {
  const mod = await import('@/app/api/onboarding/route')
  return mod.POST
}

const VALID_BODY = {
  email: 'jane@example.com',
  password: 'securepass',
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
