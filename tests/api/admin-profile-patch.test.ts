import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockAppFindUnique = vi.fn()
const mockProfileUpdate = vi.fn()
const mockAuditCreate = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    application: { findUnique: mockAppFindUnique },
    investorProfile: { update: mockProfileUpdate },
    auditEvent: { create: mockAuditCreate },
  },
}))

async function getHandler() {
  const mod = await import('@/app/api/admin/applications/[id]/profile/route')
  return mod.PATCH
}

function adminSession() {
  return { user: { id: 'admin1', role: 'admin' } }
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/test', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any
}

const baseProfile = {
  id: 'p1',
  firstName: 'Jane',
  lastName: 'Smith',
  phone: '+447700900000',
  addressLine1: '1 Park Lane',
  city: 'London',
  postcode: 'W1K 1QA',
  entityType: 'INDIVIDUAL',
  companyName: null,
  companyNumber: null,
  vatNumber: null,
  companyAddress: null,
  budgetMin: 200000,
  budgetMax: 500000,
  buyerType: 'cash',
  dateOfBirth: new Date('1985-06-15'),
  nationality: 'GB',
  taxResidency: 'GB',
  niNumber: 'AB123456C',
  isPep: false,
  pepDetails: null,
  sourceOfFunds: 'SAVINGS',
  sourceOfFundsDetail: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockProfileUpdate.mockResolvedValue({ id: 'p1' })
  mockAuditCreate.mockResolvedValue({ id: 'a1' })
})

describe('PATCH /api/admin/applications/[id]/profile', () => {
  it('401 unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const PATCH = await getHandler()
    const res = await PATCH(makeRequest({ city: 'Manchester' }), { params: { id: 'app1' } })
    expect(res.status).toBe(401)
  })

  it('403 non-admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    const PATCH = await getHandler()
    const res = await PATCH(makeRequest({ city: 'Manchester' }), { params: { id: 'app1' } })
    expect(res.status).toBe(403)
  })

  it('400 on validation error', async () => {
    mockAuth.mockResolvedValue(adminSession())
    const PATCH = await getHandler()
    const res = await PATCH(makeRequest({ phone: 'garbage' }), { params: { id: 'app1' } })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('VALIDATION_ERROR')
  })

  it('400 when no fields supplied', async () => {
    mockAuth.mockResolvedValue(adminSession())
    const PATCH = await getHandler()
    const res = await PATCH(makeRequest({}), { params: { id: 'app1' } })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('NO_FIELDS')
  })

  it('404 when application not found', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockAppFindUnique.mockResolvedValue(null)
    const PATCH = await getHandler()
    const res = await PATCH(makeRequest({ city: 'Manchester' }), { params: { id: 'missing' } })
    expect(res.status).toBe(404)
  })

  it('400 REASON_REQUIRED when AML field touched without reason', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockAppFindUnique.mockResolvedValue({ id: 'app1', investorProfile: baseProfile })
    const PATCH = await getHandler()
    const res = await PATCH(makeRequest({ niNumber: 'AB654321C' }), { params: { id: 'app1' } })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('REASON_REQUIRED')
    expect(json.fields).toEqual(['niNumber'])
  })

  it('200 with reason on AML edit, audit code = PROFILE_AML_EDITED_BY_ADMIN', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockAppFindUnique.mockResolvedValue({ id: 'app1', investorProfile: baseProfile })
    const PATCH = await getHandler()
    const res = await PATCH(
      makeRequest({ niNumber: 'CB654321C', reason: 'Investor confirmed typo on call' }),
      { params: { id: 'app1' } },
    )
    expect(res.status).toBe(200)
    expect(mockProfileUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'p1' },
      data: expect.objectContaining({ niNumber: 'CB654321C' }),
    }))
    expect(mockAuditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'PROFILE_AML_EDITED_BY_ADMIN' }),
    }))
  })

  it('200 non-AML edit uses PROFILE_EDITED_BY_ADMIN', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockAppFindUnique.mockResolvedValue({ id: 'app1', investorProfile: baseProfile })
    const PATCH = await getHandler()
    const res = await PATCH(makeRequest({ city: 'Manchester' }), { params: { id: 'app1' } })
    expect(res.status).toBe(200)
    expect(mockAuditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'PROFILE_EDITED_BY_ADMIN' }),
    }))
  })

  it('normalises NI number to uppercase no-whitespace', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockAppFindUnique.mockResolvedValue({ id: 'app1', investorProfile: baseProfile })
    const PATCH = await getHandler()
    await PATCH(
      makeRequest({ niNumber: 'cb 65 43 21 c', reason: 'Whitespace cleanup' }),
      { params: { id: 'app1' } },
    )
    expect(mockProfileUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ niNumber: 'CB654321C' }),
    }))
  })

  it('blanks out entity fields when switching back to INDIVIDUAL', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockAppFindUnique.mockResolvedValue({
      id: 'app1',
      investorProfile: { ...baseProfile, entityType: 'LTD_COMPANY', companyName: 'Acme Ltd' },
    })
    const PATCH = await getHandler()
    await PATCH(makeRequest({ entityType: 'INDIVIDUAL' }), { params: { id: 'app1' } })
    expect(mockProfileUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        entityType: 'INDIVIDUAL',
        companyName: null,
        companyNumber: null,
        vatNumber: null,
        companyAddress: null,
      }),
    }))
  })

  it('audit metadata includes diff', async () => {
    mockAuth.mockResolvedValue(adminSession())
    mockAppFindUnique.mockResolvedValue({ id: 'app1', investorProfile: baseProfile })
    const PATCH = await getHandler()
    await PATCH(makeRequest({ city: 'Manchester' }), { params: { id: 'app1' } })
    const auditCall = mockAuditCreate.mock.calls[0][0]
    const metadata = JSON.parse(auditCall.data.metadata)
    expect(metadata.diff.city).toEqual({ before: 'London', after: 'Manchester' })
  })
})
