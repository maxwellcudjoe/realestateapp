import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'admin-1', role: 'admin' } })) }))
vi.mock('@/lib/azure-blob', () => ({ getSasUrl: vi.fn(async () => 'https://blob.example/test?sig=abc') }))

import { GET } from '@/app/api/admin/inbox/attachment/route'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/inbox/attachment', () => {
  it('302 redirects to SAS URL for valid path', async () => {
    const res = await GET(new Request('http://localhost/api/admin/inbox/attachment?path=dealer-correspondence/t1/e1/brochure.pdf'))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://blob.example/test?sig=abc')
  })

  it('401 when no session', async () => {
    const { auth } = await import('@/lib/auth')
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
    const res = await GET(new Request('http://localhost/api/admin/inbox/attachment?path=dealer-correspondence/x'))
    expect(res.status).toBe(401)
  })

  it('403 when not admin', async () => {
    const { auth } = await import('@/lib/auth')
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ user: { id: 'u', role: 'investor' } })
    const res = await GET(new Request('http://localhost/api/admin/inbox/attachment?path=dealer-correspondence/x'))
    expect(res.status).toBe(403)
  })

  it('400 when path missing', async () => {
    const res = await GET(new Request('http://localhost/api/admin/inbox/attachment'))
    expect(res.status).toBe(400)
  })

  it('403 when path is outside dealer-correspondence prefix (path-traversal defence)', async () => {
    const res = await GET(new Request('http://localhost/api/admin/inbox/attachment?path=other-container/secret.pdf'))
    expect(res.status).toBe(403)
  })

  it('403 when path contains ../ traversal', async () => {
    const res = await GET(new Request('http://localhost/api/admin/inbox/attachment?path=dealer-correspondence/../../../etc/passwd'))
    expect(res.status).toBe(403)
  })
})
