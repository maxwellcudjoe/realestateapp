import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockAuth,
  mockUserFindUnique,
  mockDealFindUnique,
  mockInvoiceCreate,
  mockInvoiceFindUnique,
  mockInvoiceFindFirst,
  mockInvoiceUpdate,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockDealFindUnique: vi.fn(),
  mockInvoiceCreate: vi.fn(),
  mockInvoiceFindUnique: vi.fn(),
  mockInvoiceFindFirst: vi.fn(),
  mockInvoiceUpdate: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    deal: { findUnique: mockDealFindUnique },
    invoice: {
      create: mockInvoiceCreate,
      findUnique: mockInvoiceFindUnique,
      findFirst: mockInvoiceFindFirst,
      update: mockInvoiceUpdate,
      delete: vi.fn(),
    },
  },
}))
vi.mock('@/lib/resend', () => ({ sendEmail: vi.fn().mockResolvedValue({ id: 'm' }) }))

async function getCreateHandler() {
  const mod = await import('@/app/api/admin/invoices/route')
  return mod.POST
}
async function getPatchHandler() {
  const mod = await import('@/app/api/admin/invoices/[id]/route')
  return mod.PATCH
}

const req = (body: unknown, method = 'POST') =>
  new Request('http://localhost/api/admin/invoices', {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as import('next/server').NextRequest

const VALID_CREATE = {
  userId: 'u1',
  type: 'SOURCING',
  amount: 5000,
  description: 'Sourcing fee — 12 High St',
}

describe('POST /api/admin/invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'a1', role: 'admin' } })
    mockUserFindUnique.mockResolvedValue({
      id: 'u1', email: 'jane@example.com',
      investorProfile: { firstName: 'Jane', lastName: 'Doe' },
    })
    mockInvoiceFindFirst.mockResolvedValue(null) // numbering starts fresh
    mockInvoiceCreate.mockResolvedValue({
      id: 'inv1', invoiceNumber: 'RB-2026-0001', status: 'SENT', amount: 5000,
    })
  })

  it('rejects non-admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    const POST = await getCreateHandler()
    const res = await POST(req(VALID_CREATE), {} as never)
    expect(res.status).toBe(403)
  })

  it('rejects invalid type', async () => {
    const POST = await getCreateHandler()
    const res = await POST(req({ ...VALID_CREATE, type: 'NOPE' }), {} as never)
    expect(res.status).toBe(400)
  })

  it('rejects non-positive amount', async () => {
    const POST = await getCreateHandler()
    const res = await POST(req({ ...VALID_CREATE, amount: -1 }), {} as never)
    expect(res.status).toBe(400)
  })

  it('returns 404 when customer does not exist', async () => {
    mockUserFindUnique.mockResolvedValue(null)
    const POST = await getCreateHandler()
    const res = await POST(req(VALID_CREATE), {} as never)
    expect(res.status).toBe(404)
  })

  it('creates SENT invoice with auto invoice number', async () => {
    const POST = await getCreateHandler()
    const res = await POST(req(VALID_CREATE), {} as never)
    expect(res.status).toBe(200)
    const call = mockInvoiceCreate.mock.calls[0][0]
    expect(call.data.status).toBe('SENT')
    expect(call.data.invoiceNumber).toMatch(/^RB-\d{4}-0001$/)
    expect(call.data.issuedAt).toBeInstanceOf(Date)
    expect(call.data.dueAt).toBeInstanceOf(Date)
  })

  it('creates DRAFT invoice when sendNow=false', async () => {
    mockInvoiceCreate.mockResolvedValue({ id: 'inv1', invoiceNumber: 'RB-2026-0001', status: 'DRAFT' })
    const POST = await getCreateHandler()
    const res = await POST(req({ ...VALID_CREATE, sendNow: false }), {} as never)
    expect(res.status).toBe(200)
    expect(mockInvoiceCreate.mock.calls[0][0].data.status).toBe('DRAFT')
    expect(mockInvoiceCreate.mock.calls[0][0].data.issuedAt).toBeNull()
  })
})

describe('PATCH /api/admin/invoices/[id]', () => {
  const patchCtx = (id = 'inv1') => ({ params: Promise.resolve({ id }) })
  const patchReq = (body: unknown) =>
    new Request('http://localhost/api/admin/invoices/inv1', {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }) as unknown as import('next/server').NextRequest

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'a1', role: 'admin' } })
    mockInvoiceFindUnique.mockResolvedValue({
      id: 'inv1', invoiceNumber: 'RB-2026-0001', status: 'SENT', amount: 5000,
      dueAt: new Date(), user: { email: 'jane@example.com', investorProfile: { firstName: 'Jane' } },
    })
    mockInvoiceUpdate.mockResolvedValue({})
  })

  it('rejects non-admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    const PATCH = await getPatchHandler()
    const res = await PATCH(patchReq({ status: 'PAID', paidReference: 'X' }), patchCtx())
    expect(res.status).toBe(403)
  })

  it('rejects DRAFT → PAID transition', async () => {
    mockInvoiceFindUnique.mockResolvedValue({
      id: 'inv1', invoiceNumber: 'X', status: 'DRAFT', amount: 1,
      user: { email: 'x', investorProfile: { firstName: 'X' } },
    })
    const PATCH = await getPatchHandler()
    const res = await PATCH(patchReq({ status: 'PAID', paidReference: 'X' }), patchCtx())
    expect(res.status).toBe(409)
  })

  it('rejects PAID without reference', async () => {
    const PATCH = await getPatchHandler()
    const res = await PATCH(patchReq({ status: 'PAID' }), patchCtx())
    expect(res.status).toBe(400)
  })

  it('marks invoice PAID with reference', async () => {
    const PATCH = await getPatchHandler()
    const res = await PATCH(patchReq({ status: 'PAID', paidReference: 'BANK-ABC-123' }), patchCtx())
    expect(res.status).toBe(200)
    const call = mockInvoiceUpdate.mock.calls[0][0]
    expect(call.data.status).toBe('PAID')
    expect(call.data.paidReference).toBe('BANK-ABC-123')
    expect(call.data.paidAt).toBeInstanceOf(Date)
  })

  it('refuses to edit a non-DRAFT invoice', async () => {
    const PATCH = await getPatchHandler()
    const res = await PATCH(patchReq({ amount: 7500 }), patchCtx())
    expect(res.status).toBe(409)
  })

  it('voids an issued invoice', async () => {
    const PATCH = await getPatchHandler()
    const res = await PATCH(patchReq({ status: 'VOID' }), patchCtx())
    expect(res.status).toBe(200)
    expect(mockInvoiceUpdate.mock.calls[0][0].data.status).toBe('VOID')
  })
})
