import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { defaultDueDate } from '@/lib/invoices'
import { nextInvoiceNumber } from '@/lib/invoice-numbering'
import { nextRenewalDate, BILLING_PERIOD_LABEL, type BillingPeriod } from '@/lib/subscriptions'

/**
 * POST /api/admin/subscriptions/generate-renewals?days=N&dryRun=true&userIds=id1,id2
 *
 * Finds active subscriptions whose nextRenewalAt is within the next N days
 * (default 7) and creates a SENT subscription invoice for each, advancing
 * nextRenewalAt by one billing period. Idempotent: skips users who already
 * have a SENT/PAID subscription invoice issued in the last 25 days.
 *
 * Query params:
 *   - `days`     (default 7) — horizon for renewal window
 *   - `dryRun`   (true|false) — preview-only mode (no DB writes, no emails)
 *   - `userIds`  (comma-separated) — B2 selective billing: restrict to these
 *                 subscriber userIds (still applies the horizon + skip checks)
 *
 * Auth:
 *   - Admin session (browser via /admin/subscriptions page), OR
 *   - Bearer token matching CRON_SECRET env var (C1 scheduled job auth path)
 */
export async function POST(req: NextRequest) {
  // C1 — accept admin session OR a Bearer token matching CRON_SECRET so a
  // scheduled job (GitHub Actions / Azure Functions / external cron) can
  // trigger renewals without a user session.
  const session = await auth()
  const isAdmin = session?.user?.role === 'admin'
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization') ?? ''
  const isCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`
  if (!isAdmin && !isCron) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const horizon = Number(req.nextUrl.searchParams.get('days') ?? '7')
  const dryRun = req.nextUrl.searchParams.get('dryRun') === 'true'
  const userIdsParam = req.nextUrl.searchParams.get('userIds')
  const userIdsFilter = userIdsParam
    ? userIdsParam.split(',').map((s) => s.trim()).filter(Boolean)
    : null
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() + horizon)

  const subs = await prisma.subscription.findMany({
    where: {
      cancelledAt: null,
      nextRenewalAt: { lte: cutoff },
      ...(userIdsFilter ? { userId: { in: userIdsFilter } } : {}),
    },
    include: { user: { include: { investorProfile: true } } },
  })

  const created: { userId: string; userEmail: string; investorName: string; invoiceNumber: string; amount: number; dueAt: string }[] = []
  const skipped: { userId: string; userEmail: string; investorName: string; reason: string }[] = []

  for (const sub of subs) {
    const investorName = sub.user.investorProfile
      ? `${sub.user.investorProfile.firstName} ${sub.user.investorProfile.lastName}`.trim()
      : sub.user.email
    // Avoid double-billing: skip if any subscription invoice issued in the last 25 days
    const recent = await prisma.invoice.findFirst({
      where: {
        userId: sub.userId,
        type: 'SUBSCRIPTION',
        status: { in: ['SENT', 'PAID'] },
        issuedAt: { gte: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true },
    })
    if (recent) {
      skipped.push({ userId: sub.userId, userEmail: sub.user.email, investorName, reason: 'recent invoice exists' })
      continue
    }

    const amount = Number(sub.amount)
    const period = sub.billingPeriod as BillingPeriod
    const periodLabel = BILLING_PERIOD_LABEL[period]
    const issuedAt = now
    const dueAt = defaultDueDate(issuedAt)
    const nextRenewal = nextRenewalDate(sub.nextRenewalAt, period)

    if (dryRun) {
      // Preview-only: report what WOULD be created with a placeholder number.
      created.push({
        userId: sub.userId,
        userEmail: sub.user.email,
        investorName,
        invoiceNumber: '(preview)',
        amount,
        dueAt: dueAt.toISOString(),
      })
      continue
    }

    // Retry once on invoice-number collision
    let invoice
    for (let attempt = 0; attempt < 2; attempt++) {
      const invoiceNumber = await nextInvoiceNumber()
      try {
        invoice = await prisma.invoice.create({
          data: {
            invoiceNumber,
            userId: sub.userId,
            type: 'SUBSCRIPTION',
            amount,
            description: `Premium subscription (${periodLabel.toLowerCase()}) — renewal`,
            status: 'SENT',
            issuedAt,
            dueAt,
          },
        })
        break
      } catch (e: any) {
        if (e?.code === 'P2002' && attempt === 0) continue
        throw e
      }
    }

    if (!invoice) {
      skipped.push({ userId: sub.userId, userEmail: sub.user.email, investorName, reason: 'invoice creation failed' })
      continue
    }

    await prisma.subscription.update({
      where: { userId: sub.userId },
      data: { nextRenewalAt: nextRenewal },
    })

    created.push({
      userId: sub.userId,
      userEmail: sub.user.email,
      investorName,
      invoiceNumber: invoice.invoiceNumber,
      amount,
      dueAt: dueAt.toISOString(),
    })

    try {
      await sendEmail({
        to: sub.user.email,
        subject: `Renewal invoice — Rêve Bâtir Premium ${invoice.invoiceNumber}`,
        html: `
          <p>Hello ${sub.user.investorProfile?.firstName ?? ''},</p>
          <p>Your Premium subscription renewal invoice <strong>${invoice.invoiceNumber}</strong> for <strong>£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</strong> is due ${dueAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
          <p><a href="${process.env.NEXTAUTH_URL}/portal/invoices">View invoice →</a></p>
        `,
      })
    } catch (e) {
      console.error('Renewal email failed (non-fatal):', e)
    }
  }

  return NextResponse.json({ success: true, dryRun, created, skipped, total: subs.length })
}
