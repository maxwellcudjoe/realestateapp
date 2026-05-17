// Login attempt tracking + IP-based lockout.
// 5 failed attempts from the same IP within 15 min → lockout for 15 min.

import { prisma } from '@/lib/prisma'

export const LOCKOUT_THRESHOLD = 5
export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000

/** Check whether the given IP is currently locked out due to recent failures. */
export async function isIpLockedOut(ipAddress: string): Promise<boolean> {
  if (!ipAddress || ipAddress === 'unknown') return false

  const since = new Date(Date.now() - LOCKOUT_WINDOW_MS)
  const failures = await prisma.loginAttempt.count({
    where: { ipAddress, success: false, createdAt: { gte: since } },
  })
  return failures >= LOCKOUT_THRESHOLD
}

/** Record a login attempt. Never throws — failure to log must not block sign-in. */
export async function recordLoginAttempt(params: {
  email: string
  ipAddress: string
  success: boolean
  userId?: string | null
  reason?: string | null
}) {
  try {
    await prisma.loginAttempt.create({
      data: {
        email: params.email.toLowerCase().trim(),
        ipAddress: params.ipAddress || 'unknown',
        success: params.success,
        userId: params.userId ?? null,
        reason: params.reason ?? null,
      },
    })
  } catch (e) {
    console.error('[login-tracking] failed to record attempt:', e)
  }
}

/** Fetch the most recent N login attempts for a given user — for /portal/security view. */
export async function recentAttemptsForUser(userId: string, limit = 10) {
  return prisma.loginAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, ipAddress: true, success: true, reason: true, createdAt: true },
  })
}
