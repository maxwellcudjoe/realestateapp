import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockFindUnique = vi.fn()
const mockCreate = vi.fn()
const mockDeleteMany = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mockFindUnique },
    document: { create: mockCreate, deleteMany: mockDeleteMany },
  },
}))
vi.mock('@/lib/azure-blob', () => ({
  uploadDocument: vi.fn().mockResolvedValue(undefined),
}))

async function getHandler() {
  const mod = await import('@/app/api/portal/documents/route')
  return mod.POST
}

describe('POST /api/portal/documents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    mockFindUnique.mockResolvedValue({
      investorProfile: {
        application: { id: 'a1', status: 'DOCUMENTS_REQUESTED' },
      },
    })
    mockDeleteMany.mockResolvedValue({ count: 0 })
    mockCreate.mockResolvedValue({ id: 'd1', fileName: 'passport.pdf' })
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const POST = await getHandler()
    const form = new FormData()
    form.append('type', 'PASSPORT')
    form.append('file', new Blob(['test'], { type: 'application/pdf' }), 'test.pdf')
    const req = new Request('http://localhost/api/portal/documents', { method: 'POST', body: form })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  it('returns 403 when application status is not DOCUMENTS_REQUESTED', async () => {
    mockFindUnique.mockResolvedValue({
      investorProfile: { application: { id: 'a1', status: 'SUBMITTED' } },
    })
    const POST = await getHandler()
    const form = new FormData()
    form.append('type', 'PASSPORT')
    form.append('file', new Blob(['test'], { type: 'application/pdf' }), 'test.pdf')
    const req = new Request('http://localhost/api/portal/documents', { method: 'POST', body: form })
    const res = await POST(req as any)
    expect(res.status).toBe(403)
  })
})
