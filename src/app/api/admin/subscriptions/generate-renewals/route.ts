import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { defaultDueDate } from '@/lib/invoices'
import { nextInvoiceNumber } from '@/lib/invoice-numbering'
import { nextRenewalDate, BILLING_PERIOD_LABEL, type BillingPeriod } from '@/lib/subscriptions'

/**
 * POST /api/admin/subscriptions/generate-renewals
 * Finds active subscriptions whose nextRenewalAt is within the next N days
 * (default 7) and creates a SENT subscription invoice for each, advancing
 * nextRenewalAt by one billing period. Idempotent: skips users who already
 * have a SENT subscription invoice for the current period.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const horizon = Number(req.nextUrl.searchParams.get('days') ?? '7')
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() + horizon)

  const subs = await prisma.subscription.findMany({
    where: { cancelledAt: null, nextRenewalAt: { lte: cutoff } },
    include: { user: { include: { investorProfile: true } } },
  })

  const created: { userId: string; invoiceNumber: string; amount: number }[] = []
  const skipped: { userId: string; reason: string }[] = []

  for (const sub of subs) {
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
      skipped.push({ userId: sub.userId, reason: 'recent invoice exists' })
      continue
    }

    const amount = Number(sub.amount)
    const period = sub.billingPeriod as BillingPeriod
    const periodLabel = BILLING_PERIOD_LABEL[period]
    const issuedAt = now
    const dueAt = defaultDueDate(issuedAt)
    const nextRenewal = nextRenewalDate(sub.nextRenewalAt, period)

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
      skipped.push({ userId: sub.userId, reason: 'invoice creation failed' })
      continue
    }

    await prisma.subscription.update({
      where: { userId: sub.userId },
      data: { nextRenewalAt: nextRenewal },
    })

    created.push({ userId: sub.userId, invoiceNumber: invoice.invoiceNumber, amount })

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

  return NextResponse.json({ success: true, created, skipped, total: subs.length })
}
