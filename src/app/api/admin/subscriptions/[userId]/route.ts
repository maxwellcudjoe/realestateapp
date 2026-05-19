import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import {
  BILLING_PERIODS,
  defaultAmountFor,
  nextRenewalDate,
  type BillingPeriod,
} from '@/lib/subscriptions'
import { z } from 'zod'

const upsertSchema = z.object({
  billingPeriod: z.enum(BILLING_PERIODS),
  amount: z.number().positive().max(100_000).optional(),
})

/**
 * POST /api/admin/subscriptions/[userId]
 * Activate or replace a premium subscription for a user.
 * Sets User.tier=PREMIUM, creates/replaces Subscription row, sends email.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ userId: string }> }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await ctx.params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  const period: BillingPeriod = parsed.data.billingPeriod
  const amount = parsed.data.amount ?? defaultAmountFor(period)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { investorProfile: true, subscription: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const now = new Date()
  const renewal = nextRenewalDate(now, period)

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { tier: 'PREMIUM' } }),
    user.subscription
      ? prisma.subscription.update({
          where: { userId },
          data: { billingPeriod: period, amount, cancelledAt: null, nextRenewalAt: renewal, startedAt: user.subscription.startedAt },
        })
      : prisma.subscription.create({
          data: { userId, billingPeriod: period, amount, startedAt: now, nextRenewalAt: renewal },
        }),
  ])

  try {
    await sendEmail({
      to: user.email,
      subject: 'Welcome to Rêve Bâtir Premium',
      html: `
        <p>Hello ${user.investorProfile?.firstName ?? ''},</p>
        <p>Your <strong>Premium</strong> subscription is active. You now get a 48-hour head start on new deals before they're shown to FREE members.</p>
        <p>Billing: <strong>£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</strong> ${period.toLowerCase()} · next renewal ${renewal.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
        <p><a href="${process.env.NEXTAUTH_URL}/portal/subscription">Manage subscription →</a></p>
      `,
    })
  } catch (e) {
    console.error('Subscription welcome email failed (non-fatal):', e)
  }

  return NextResponse.json({ success: true })
}

/**
 * DELETE /api/admin/subscriptions/[userId]
 * Cancel a subscription. User retains PREMIUM access until nextRenewalAt
 * passes — only Subscription.cancelledAt is set here. Use effectiveTier()
 * at read-time to compute the runtime tier.
 */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ userId: string }> }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { userId } = await ctx.params
  const sub = await prisma.subscription.findUnique({ where: { userId } })
  if (!sub) return NextResponse.json({ error: 'No subscription to cancel' }, { status: 404 })
  if (sub.cancelledAt) return NextResponse.json({ error: 'Subscription is already cancelled' }, { status: 409 })

  await prisma.subscription.update({
    where: { userId },
    data: { cancelledAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
