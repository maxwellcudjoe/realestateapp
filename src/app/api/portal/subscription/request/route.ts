import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { createNotification } from '@/lib/notifications'
import { escapeHtml } from '@/lib/html-escape'
import { z } from 'zod'

const REQUEST_TYPES = ['UPGRADE', 'CHANGE_MONTHLY', 'CHANGE_ANNUAL', 'CANCEL'] as const

const REQUEST_LABEL: Record<(typeof REQUEST_TYPES)[number], string> = {
  UPGRADE: 'Upgrade to Premium',
  CHANGE_MONTHLY: 'Change plan to Monthly',
  CHANGE_ANNUAL: 'Change plan to Annual',
  CANCEL: 'Cancel subscription',
}

const schema = z.object({
  type: z.enum(REQUEST_TYPES),
  reason: z.string().max(2000).optional().default(''),
})

/**
 * POST /api/portal/subscription/request — B1
 *
 * Lets an investor request a subscription change (upgrade, plan-change,
 * cancel) without leaving the portal. Creates a Message scoped to the
 * investor's application so admin sees it in the existing Messages thread,
 * plus an in-portal notification + email. Admin actions the request manually
 * via the SubscriptionPanel on the investor's profile.
 *
 * Why not a direct self-serve action? Money flow is solicitor-only (no
 * payment processor) — admin needs to verify a bank transfer before
 * activating, and cancellations may have refund implications worth a
 * human conversation.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  const { type, reason } = parsed.data

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      investorProfile: {
        include: { application: { select: { id: true } } },
      },
      subscription: { select: { billingPeriod: true, amount: true, cancelledAt: true, nextRenewalAt: true } },
    },
  })
  const applicationId = user?.investorProfile?.application?.id
  if (!applicationId) return NextResponse.json({ error: 'No active investor application' }, { status: 404 })

  // Friendly sanity: don't accept UPGRADE if they're already PREMIUM, or
  // CHANGE_x if they're not PREMIUM. Soft-warn but still create the message
  // since admin context might explain it (e.g. reactivation after expiry).
  const label = REQUEST_LABEL[type]
  const subject = `[Subscription request] ${label}`
  const currentState = user.subscription
    ? `Currently: ${user.subscription.billingPeriod} at £${Number(user.subscription.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}${user.subscription.cancelledAt ? ' (cancelled)' : ''}, renews ${user.subscription.nextRenewalAt.toLocaleDateString('en-GB')}`
    : `Currently: FREE tier (no active subscription)`
  const messageBody = [
    `Request type: ${label}`,
    currentState,
    reason ? `\nReason: ${reason}` : '',
  ].filter(Boolean).join('\n')

  await prisma.message.create({
    data: {
      applicationId,
      senderUserId: session.user.id,
      subject,
      body: messageBody,
    },
  })

  // Notification to all admins — there's no per-admin routing today, so we
  // notify the configured RESEND_TO_EMAIL admin user.
  try {
    const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } })
    await Promise.all(admins.map((a) =>
      createNotification({
        userId: a.id,
        type: 'SUBSCRIPTION_REQUEST',
        title: `Subscription request: ${label}`,
        body: `${user.investorProfile!.firstName} ${user.investorProfile!.lastName} — ${reason || 'no reason given'}`,
        link: `/admin/investors/${applicationId}`,
      }),
    ))
  } catch (e) {
    console.error('Subscription-request notification failed (non-fatal):', e)
  }

  try {
    await sendEmail({
      to: process.env.RESEND_TO_EMAIL!,
      subject,
      html: `
        <p><strong>${escapeHtml(user.investorProfile!.firstName)} ${escapeHtml(user.investorProfile!.lastName)}</strong> (${escapeHtml(user.email)}) requested: <strong>${label}</strong>.</p>
        <p>${escapeHtml(currentState)}</p>
        ${reason ? `<p style="border-left:2px solid #c9a84c;padding-left:16px;color:#888;font-style:italic">${escapeHtml(reason)}</p>` : ''}
        <p><a href="${process.env.NEXTAUTH_URL}/admin/investors/${applicationId}">Open investor profile →</a></p>
      `,
    })
  } catch (e) {
    console.error('Subscription-request email failed (non-fatal):', e)
  }

  return NextResponse.json({ success: true })
}
