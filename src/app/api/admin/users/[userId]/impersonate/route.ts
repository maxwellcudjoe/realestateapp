import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import {
  IMPERSONATE_COOKIE,
  IMPERSONATE_TTL_MS,
  signImpersonateCookie,
  verifyImpersonateCookie,
  type ImpersonateMode,
} from '@/lib/impersonate'
import { z } from 'zod'

const startSchema = z.object({
  mode: z.enum(['read', 'write']).default('read'),
  reason: z.string().max(500).optional(),
}).refine((d) => d.mode === 'read' || (d.reason && d.reason.trim().length >= 3), {
  path: ['reason'],
  message: 'Write-mode impersonation requires a reason (3+ chars)',
})

function getSecret(): string {
  const s = process.env.NEXTAUTH_SECRET
  if (!s) throw new Error('NEXTAUTH_SECRET not configured')
  return s
}

function readCookie(req: NextRequest, name: string): string | undefined {
  // Prefer NextRequest cookies API when available, fall back to header parse
  // (the latter is what tests can drive with a plain Request).
  if (req.cookies && typeof req.cookies.get === 'function') {
    const c = req.cookies.get(name)?.value
    if (c) return c
  }
  const header = req.headers.get('cookie') ?? ''
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1))
  }
  return undefined
}

/**
 * POST /api/admin/users/[userId]/impersonate — start an impersonation session.
 * Admin only. Cannot impersonate another admin. Body: { mode?: 'read'|'write',
 * reason?: string }. Write-mode requires a reason (3+ chars).
 */
export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (session.user.impersonator) {
    return NextResponse.json({ error: 'IMPERSONATION_ACTIVE', message: 'End the current impersonation first.' }, { status: 409 })
  }
  if (params.userId === session.user.id) {
    return NextResponse.json({ error: 'Cannot impersonate yourself' }, { status: 400 })
  }

  let body: unknown = {}
  try { body = await req.json() } catch { /* empty body is fine — defaults to read */ }
  const parsed = startSchema.safeParse(body ?? {})
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: parsed.error.errors[0].message },
      { status: 400 },
    )
  }
  const mode: ImpersonateMode = parsed.data.mode
  const reason = parsed.data.reason?.trim()

  const target = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, role: true, deletedAt: true, email: true },
  })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (target.role === 'admin') {
    await recordAudit({
      actorUserId: session.user.id,
      actorRole: 'admin',
      action: 'IMPERSONATION_BLOCKED_WRITE',
      resourceType: 'User',
      resourceId: target.id,
      metadata: { reason: 'target-is-admin', mode },
    })
    return NextResponse.json({ error: 'Cannot impersonate another admin' }, { status: 400 })
  }
  if (target.deletedAt) {
    return NextResponse.json({ error: 'Cannot impersonate a deleted user' }, { status: 400 })
  }

  const { value, payload } = await signImpersonateCookie(
    getSecret(),
    session.user.id,
    target.id,
    new Date(),
    mode,
    reason,
  )
  const res = NextResponse.json({
    success: true,
    mode,
    expiresAt: new Date(payload.expiresAt).toISOString(),
  })
  res.cookies.set(IMPERSONATE_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(IMPERSONATE_TTL_MS / 1000),
  })

  await recordAudit({
    actorUserId: session.user.id,
    actorRole: 'admin',
    action: 'IMPERSONATION_STARTED',
    resourceType: 'User',
    resourceId: target.id,
    metadata: {
      targetEmail: target.email,
      expiresAt: new Date(payload.expiresAt).toISOString(),
      mode,
      ...(reason ? { reason } : {}),
    },
  })

  return res
}

/**
 * DELETE /api/admin/users/[userId]/impersonate — end an active impersonation
 * session. Always reachable (even from inside an impersonation, since the
 * middleware allowlist permits the stop endpoint).
 */
export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  const cookie = readCookie(req, IMPERSONATE_COOKIE)
  const payload = await verifyImpersonateCookie(getSecret(), cookie)
  const res = NextResponse.json({ success: true })
  res.cookies.set(IMPERSONATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })

  if (payload) {
    await recordAudit({
      actorUserId: payload.adminId,
      actorRole: 'admin',
      action: 'IMPERSONATION_ENDED',
      resourceType: 'User',
      resourceId: params.userId,
      metadata: { duration: Date.now() - payload.issuedAt, mode: payload.mode },
    })
  }

  return res
}
