import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyWebhookSignature, mapSumSubStatus, getApplicantStatus } from '@/lib/sumsub'
import { recordAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'

/**
 * SumSub webhook handler. Receives events when applicant status changes,
 * including applicantReviewed, applicantPending, applicantOnHold.
 *
 * Configure in SumSub dashboard:
 *   Webhook URL: {NEXTAUTH_URL}/api/webhooks/sumsub
 *   Set SUMSUB_WEBHOOK_SECRET in Azure SWA env to enable signature verification
 *
 * Even if signature verification is skipped (no secret set), we still re-fetch
 * the canonical status from the API — never trust the webhook body alone.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-payload-digest') ?? ''
  const algo = req.headers.get('x-payload-digest-alg') ?? 'HMAC_SHA256_HEX'

  // Verify signature when secret is set (recommended). Drop unsigned events when configured.
  if (process.env.SUMSUB_WEBHOOK_SECRET) {
    if (!signature || !verifyWebhookSignature(rawBody, signature, algo)) {
      console.warn('[sumsub-webhook] signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let body: { applicantId?: string; externalUserId?: string; type?: string }
  try { body = JSON.parse(rawBody) } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const applicantId = body.applicantId
  if (!applicantId) return NextResponse.json({ ignored: true })

  // Find our investor profile
  const profile = await prisma.investorProfile.findFirst({
    where: { sumsubApplicantId: applicantId },
    include: { user: { select: { id: true, email: true } }, application: { select: { id: true } } },
  })
  if (!profile) {
    console.warn(`[sumsub-webhook] unknown applicant ${applicantId}`)
    return NextResponse.json({ ignored: true })
  }

  // Re-fetch canonical status from API (don't trust the webhook body)
  let status
  try { status = await getApplicantStatus(applicantId) } catch (e) {
    console.error('[sumsub-webhook] getApplicantStatus failed:', e)
    return NextResponse.json({ error: 'status fetch failed' }, { status: 502 })
  }

  const mapped = mapSumSubStatus(status)

  // Upsert latest KycCheck for this application
  if (profile.application) {
    const latest = await prisma.kycCheck.findFirst({
      where: { applicationId: profile.application.id, provider: 'SUMSUB', externalCheckId: applicantId },
      orderBy: { startedAt: 'desc' },
    })
    if (latest) {
      await prisma.kycCheck.update({
        where: { id: latest.id },
        data: {
          status: mapped,
          rawResult: JSON.stringify(status),
          completedAt: mapped !== 'PENDING' ? new Date() : latest.completedAt,
        },
      })
    } else {
      await prisma.kycCheck.create({
        data: {
          applicationId: profile.application.id,
          provider: 'SUMSUB',
          externalCheckId: applicantId,
          status: mapped,
          rawResult: JSON.stringify(status),
          completedAt: mapped !== 'PENDING' ? new Date() : null,
        },
      })
    }
  }

  await recordAudit({
    action: 'APPLICATION_STATUS_CHANGED',
    resourceType: 'KycCheck',
    resourceId: applicantId,
    metadata: { provider: 'SUMSUB', mappedStatus: mapped, sumsubStatus: status.reviewStatus, answer: status.reviewResult?.reviewAnswer ?? null, webhookType: body.type ?? null },
  })

  // Notify investor on terminal outcomes
  if (mapped === 'CLEAR') {
    await createNotification({
      userId: profile.user.id, type: 'KYC_STATUS',
      title: 'KYC verification complete', body: 'Your identity has been verified.',
      link: '/portal/status',
    })
  } else if (mapped === 'REJECTED') {
    await createNotification({
      userId: profile.user.id, type: 'KYC_STATUS',
      title: 'KYC verification could not be completed',
      body: 'Please check your messages — our team will be in touch shortly.',
      link: '/portal/messages',
    })
  }

  return NextResponse.json({ ok: true, status: mapped })
}
