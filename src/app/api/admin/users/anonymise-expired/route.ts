import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { anonymiseUser, findExpiredSoftDeletes } from '@/lib/user-anonymise'

const DEFAULT_GRACE_DAYS = 30

/**
 * Soft-delete grace cron — runs daily. Finds users whose `deletedAt` is
 * older than `?graceDays=` (default 30) AND `anonymisedAt` is null, then
 * runs the full anonymisation transaction on each.
 *
 * Auth: admin session OR Bearer CRON_SECRET (same model as generate-renewals).
 *
 * `?dryRun=true` returns the candidate list without mutating.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isCron = authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`

  let actorUserId: string | null = null
  let actorRole = 'cron'
  if (!isCron) {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    actorUserId = session.user.id
    actorRole = 'admin'
  }

  const url = new URL(req.url)
  const graceDays = Math.max(1, parseInt(url.searchParams.get('graceDays') ?? String(DEFAULT_GRACE_DAYS), 10) || DEFAULT_GRACE_DAYS)
  const dryRun = url.searchParams.get('dryRun') === 'true'

  const candidates = await findExpiredSoftDeletes(prisma, graceDays)
  if (dryRun) {
    return NextResponse.json({
      mode: 'dryRun',
      graceDays,
      candidateCount: candidates.length,
      candidates: candidates.map((c) => ({
        userId: c.id,
        deletedAt: c.deletedAt?.toISOString() ?? null,
      })),
    })
  }

  const results: { userId: string; status: 'anonymised' | 'error'; error?: string }[] = []
  for (const c of candidates) {
    try {
      await anonymiseUser(prisma, c.id)
      await recordAudit({
        actorUserId,
        actorRole,
        action: 'USER_ANONYMISED',
        resourceType: 'User',
        resourceId: c.id,
        metadata: { graceDays, deletedAt: c.deletedAt?.toISOString() ?? null },
      })
      results.push({ userId: c.id, status: 'anonymised' })
    } catch (e) {
      console.error(`[anonymise-expired] failed for ${c.id}:`, e)
      results.push({ userId: c.id, status: 'error', error: e instanceof Error ? e.message : 'unknown' })
    }
  }

  await recordAudit({
    actorUserId,
    actorRole,
    action: 'ANONYMISATION_RUN',
    resourceType: 'User',
    metadata: {
      graceDays,
      processed: results.length,
      successful: results.filter((r) => r.status === 'anonymised').length,
      errors: results.filter((r) => r.status === 'error').length,
    },
  })

  return NextResponse.json({
    mode: 'run',
    graceDays,
    processed: results.length,
    successful: results.filter((r) => r.status === 'anonymised').length,
    errors: results.filter((r) => r.status === 'error').length,
    results,
  })
}
