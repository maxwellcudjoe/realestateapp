import { describe, it, expect, beforeEach, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({ lead: { findMany: vi.fn() } }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => ({ user: { id: 'admin-1', role: 'admin' } })) }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { GET } from '@/app/api/admin/leads/route'

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.lead.findMany.mockResolvedValue([
    { id: 'l1', name: 'A', status: 'NEW' },
    { id: 'l2', name: 'B', status: 'QUALIFIED' },
  ])
})

describe('GET /api/admin/leads', () => {
  it('returns all leads by default', async () => {
    const res = await GET(new Request('http://localhost/api/admin/leads'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.leads).toHaveLength(2)
    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { createdAt: 'desc' },
    }))
  })

  it('filters by ?status=QUALIFIED', async () => {
    await GET(new Request('http://localhost/api/admin/leads?status=QUALIFIED'))
    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'QUALIFIED' }),
    }))
  })

  it('ignores invalid status param (no filter applied)', async () => {
    await GET(new Request('http://localhost/api/admin/leads?status=GARBAGE'))
    expect(prismaMock.lead.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {},
    }))
  })

  it('403 when not admin', async () => {
    const { auth } = await import('@/lib/auth')
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ user: { id: 'u', role: 'investor' } })
    const res = await GET(new Request('http://localhost/api/admin/leads'))
    expect(res.status).toBe(403)
  })
})
