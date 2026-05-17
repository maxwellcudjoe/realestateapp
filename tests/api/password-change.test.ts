import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuth = vi.fn()
const mockFindUnique = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mockFindUnique, update: mockUpdate },
  },
}))
vi.mock('@/lib/password', () => ({
  checkPasswordBreached: vi.fn().mockResolvedValue({ pwned: false, count: 0 }),
}))

async function getHandler() {
  const mod = await import('@/app/api/portal/password/change/route')
  return mod.POST
}

describe('POST /api/portal/password/change', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: 'u1' } })
    mockFindUnique.mockResolvedValue({
      id: 'u1',
      // bcrypt hash of "Oldpass1!"
      passwordHash: '$2a$10$abcdefghijklmnopqrstuv',
    })
    mockUpdate.mockResolvedValue({})
  })

  function makeReq(body: any) {
    return new Request('http://localhost/api/portal/password/change', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }) as any
  }

  it('returns 401 when no session', async () => {
    mockAuth.mockResolvedValue(null)
    const POST = await getHandler()
    const res = await POST(makeReq({ currentPassword: 'a', newPassword: 'Whatever1!' }))
    expect(res.status).toBe(401)
  })

  it('rejects when new password matches current', async () => {
    const POST = await getHandler()
    const res = await POST(makeReq({ currentPassword: 'Same1!Aaaa', newPassword: 'Same1!Aaaa' }))
    expect(res.status).toBe(400)
  })

  it('rejects weak new password', async () => {
    const POST = await getHandler()
    const res = await POST(makeReq({ currentPassword: 'Oldpass1!', newPassword: 'weak' }))
    expect(res.status).toBe(400)
  })

  it('rejects when current password does not match hash', async () => {
    const POST = await getHandler()
    const res = await POST(makeReq({ currentPassword: 'WrongCurrent1!', newPassword: 'Newpass1!' }))
    expect(res.status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
