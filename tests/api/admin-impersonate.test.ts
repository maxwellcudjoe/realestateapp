import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockUserFindUnique = vi.fn()
const mockAuditCreate = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    auditEvent: { create: mockAuditCreate },
  },
}))

async function getHandlers() {
  const mod = await import('@/app/api/admin/users/[userId]/impersonate/route')
  return { POST: mod.POST, DELETE: mod.DELETE }
}

function makeRequest(method: string = 'POST', cookieHeader?: string) {
  return new Request('http://localhost/api/admin/users/u1/impersonate', {
    method,
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  }) as any
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuditCreate.mockResolvedValue({ id: 'a1' })
  process.env.NEXTAUTH_SECRET = 'test-secret-32-chars-or-more-padding'
  process.env.NODE_ENV = 'test'
})

describe('POST /api/admin/users/[userId]/impersonate', () => {
  it('401 unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const { POST } = await getHandlers()
    const res = await POST(makeRequest(), { params: { userId: 'u1' } })
    expect(res.status).toBe(401)
  })

  it('403 non-admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'investor' } })
    const { POST } = await getHandlers()
    const res = await POST(makeRequest(), { params: { userId: 'u2' } })
    expect(res.status).toBe(403)
  })

  it('409 when already impersonating', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin1', role: 'admin', impersonator: 'admin1' } })
    const { POST } = await getHandlers()
    const res = await POST(makeRequest(), { params: { userId: 'u1' } })
    expect(res.status).toBe(409)
  })

  it('400 cannot impersonate self', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin1', role: 'admin' } })
    const { POST } = await getHandlers()
    const res = await POST(makeRequest(), { params: { userId: 'admin1' } })
    expect(res.status).toBe(400)
  })

  it('404 target not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin1', role: 'admin' } })
    mockUserFindUnique.mockResolvedValue(null)
    const { POST } = await getHandlers()
    const res = await POST(makeRequest(), { params: { userId: 'missing' } })
    expect(res.status).toBe(404)
  })

  it('400 cannot impersonate another admin + writes IMPERSONATION_BLOCKED_WRITE audit', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin1', role: 'admin' } })
    mockUserFindUnique.mockResolvedValue({ id: 'admin2', role: 'admin', deletedAt: null, email: 'a2@x.com' })
    const { POST } = await getHandlers()
    const res = await POST(makeRequest(), { params: { userId: 'admin2' } })
    expect(res.status).toBe(400)
    expect(mockAuditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'IMPERSONATION_BLOCKED_WRITE' }),
    }))
  })

  it('400 cannot impersonate a deleted user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin1', role: 'admin' } })
    mockUserFindUnique.mockResolvedValue({ id: 'u1', role: 'investor', deletedAt: new Date(), email: 'u1@x.com' })
    const { POST } = await getHandlers()
    const res = await POST(makeRequest(), { params: { userId: 'u1' } })
    expect(res.status).toBe(400)
  })

  it('200 sets impersonate cookie + writes IMPERSONATION_STARTED', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin1', role: 'admin' } })
    mockUserFindUnique.mockResolvedValue({ id: 'u1', role: 'investor', deletedAt: null, email: 'jane@x.com' })
    const { POST } = await getHandlers()
    const res = await POST(makeRequest(), { params: { userId: 'u1' } })
    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('__impersonate=')
    expect(setCookie).toContain('HttpOnly')
    expect(mockAuditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'IMPERSONATION_STARTED', resourceId: 'u1' }),
    }))
  })
})

describe('DELETE /api/admin/users/[userId]/impersonate', () => {
  it('always clears cookie + returns 200', async () => {
    const { DELETE } = await getHandlers()
    const res = await DELETE(makeRequest('DELETE'), { params: { userId: 'u1' } })
    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('__impersonate=')
    expect(setCookie).toMatch(/Max-Age=0/i)
  })

  it('writes IMPERSONATION_ENDED audit when a valid cookie is present', async () => {
    // Sign a cookie via the lib then pass it on the request
    const { signImpersonateCookie } = await import('@/lib/impersonate')
    const { value } = await signImpersonateCookie('test-secret-32-chars-or-more-padding', 'admin1', 'u1')
    const { DELETE } = await getHandlers()
    const res = await DELETE(makeRequest('DELETE', `__impersonate=${value}`), { params: { userId: 'u1' } })
    expect(res.status).toBe(200)
    expect(mockAuditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'IMPERSONATION_ENDED', resourceId: 'u1' }),
    }))
  })

  it('does NOT write audit when no valid cookie is present', async () => {
    const { DELETE } = await getHandlers()
    const res = await DELETE(makeRequest('DELETE'), { params: { userId: 'u1' } })
    expect(res.status).toBe(200)
    expect(mockAuditCreate).not.toHaveBeenCalled()
  })
})
