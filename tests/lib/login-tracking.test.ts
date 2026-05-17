import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCount = vi.fn()
const mockCreate = vi.fn()
const mockFindMany = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    loginAttempt: {
      count: mockCount,
      create: mockCreate,
      findMany: mockFindMany,
    },
  },
}))

const { isIpLockedOut, recordLoginAttempt, recentAttemptsForUser, LOCKOUT_THRESHOLD } = await import('@/lib/login-tracking')

describe('isIpLockedOut', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns false for unknown IP', async () => {
    expect(await isIpLockedOut('unknown')).toBe(false)
    expect(await isIpLockedOut('')).toBe(false)
    expect(mockCount).not.toHaveBeenCalled()
  })

  it('returns true when failures meet threshold', async () => {
    mockCount.mockResolvedValue(LOCKOUT_THRESHOLD)
    expect(await isIpLockedOut('1.2.3.4')).toBe(true)
  })

  it('returns false when below threshold', async () => {
    mockCount.mockResolvedValue(LOCKOUT_THRESHOLD - 1)
    expect(await isIpLockedOut('1.2.3.4')).toBe(false)
  })

  it('queries only failed attempts within the window', async () => {
    mockCount.mockResolvedValue(0)
    await isIpLockedOut('1.2.3.4')
    const args = mockCount.mock.calls[0][0]
    expect(args.where.ipAddress).toBe('1.2.3.4')
    expect(args.where.success).toBe(false)
    expect(args.where.createdAt.gte).toBeInstanceOf(Date)
  })
})

describe('recordLoginAttempt', () => {
  beforeEach(() => vi.clearAllMocks())

  it('writes a row with normalised email', async () => {
    mockCreate.mockResolvedValue({ id: 'a1' })
    await recordLoginAttempt({ email: '  Jane@Example.COM ', ipAddress: '1.2.3.4', success: true, userId: 'u1' })
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'jane@example.com',
        ipAddress: '1.2.3.4',
        success: true,
        userId: 'u1',
      }),
    })
  })

  it('falls back to "unknown" IP when missing', async () => {
    mockCreate.mockResolvedValue({ id: 'a1' })
    await recordLoginAttempt({ email: 'a@b.com', ipAddress: '', success: false })
    expect(mockCreate.mock.calls[0][0].data.ipAddress).toBe('unknown')
  })

  it('swallows errors so sign-in is never blocked', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCreate.mockRejectedValue(new Error('db down'))
    await expect(
      recordLoginAttempt({ email: 'a@b.com', ipAddress: '1.2.3.4', success: false }),
    ).resolves.toBeUndefined()
  })
})

describe('recentAttemptsForUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns most recent attempts capped at limit', async () => {
    mockFindMany.mockResolvedValue([{ id: 'a1' }])
    const result = await recentAttemptsForUser('u1', 5)
    expect(result).toEqual([{ id: 'a1' }])
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1' },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    )
  })
})
