import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockTransaction = vi.fn()
const mockFindUnique = vi.fn()
const mockLeadFindFirst = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mockFindUnique },
    lead: { findFirst: mockLeadFindFirst },
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

const convertLeadMock = vi.fn(async () => ({
  userId: 'u1',
  applicationId: 'a1',
  investorProfileId: 'p1',
  fromAutoMatch: true,
}))
vi.mock('@/lib/leads/convert', () => ({ convertLead: convertLeadMock }))

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
  strategies: ['BTL'],
  buyerType: 'cash',
  targetAreaCodes: ['manchester', 'leeds'],
  entityType: 'INDIVIDUAL',
  companyName: '',
  companyNumber: '',
  vatNumber: '',
  companyAddress: '',
  experienceLevel: 'OWN_1_3',
  timelineToBuy: 'M_1_3',
  mortgageStatus: 'NONE',
  mortgageLender: '',
  referralSource: 'Google',
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

function makeReq(payload: unknown): Request {
  return new Request('http://localhost/api/onboarding', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/onboarding — auto-match hook', () => {
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
        targetArea: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
        investorStrategy: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
      }
      return fn(txMock)
    })
  })

  it('calls convertLead with the new user when a matching unconverted Lead exists', async () => {
    mockLeadFindFirst.mockResolvedValueOnce({ id: 'lead-1', email: 'jane@example.com' })
    const POST = await getHandler()
    const res = await POST(makeReq(VALID_BODY) as never)
    expect(res.status).toBeLessThan(400)
    expect(convertLeadMock).toHaveBeenCalledWith('lead-1', expect.objectContaining({
      existingUserId: 'u1',
      existingApplicationId: 'a1',
      existingInvestorProfileId: 'p1',
    }))
  })

  it('does NOT call convertLead when no matching Lead', async () => {
    mockLeadFindFirst.mockResolvedValueOnce(null)
    const POST = await getHandler()
    const res = await POST(makeReq(VALID_BODY) as never)
    expect(res.status).toBeLessThan(400)
    expect(convertLeadMock).not.toHaveBeenCalled()
  })

  it('swallows convertLead errors (auto-match never blocks onboarding)', async () => {
    mockLeadFindFirst.mockResolvedValueOnce({ id: 'lead-1', email: 'jane@example.com' })
    convertLeadMock.mockRejectedValueOnce(new Error('convert failed'))
    const POST = await getHandler()
    const res = await POST(makeReq(VALID_BODY) as never)
    expect(res.status).toBeLessThan(400)
  })
})
