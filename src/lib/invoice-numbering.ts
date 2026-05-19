import { prisma } from '@/lib/prisma'
import { INVOICE_NUMBER_PREFIX } from '@/lib/invoices'

/**
 * Generates the next sequential invoice number for the current year:
 * RB-YYYY-NNNN, padded to 4 digits.
 *
 * Audit PR #4 / C6 fix — uses the dedicated InvoiceCounter table with an
 * atomic upsert + increment. SQL Server's UPDATE-with-SET acquires the
 * row's update lock so concurrent issuances serialize, eliminating the
 * race + 500 surface area of the prior max-query-then-create approach.
 *
 * One row per (prefix, year), keyed on `prefix` (e.g. "RB-2026"). The
 * @id makes upsert atomic: first-call inserts seq=1; subsequent calls
 * UPDATE seq+1 in a single round-trip.
 *
 * Server-only (Prisma) — kept out of `@/lib/invoices` so client
 * components can import the rest of the invoice helpers without dragging
 * mssql into the browser bundle.
 */
export async function nextInvoiceNumber(now: Date = new Date()): Promise<string> {
  const year = now.getFullYear()
  const prefix = `${INVOICE_NUMBER_PREFIX}-${year}`
  const counter = await prisma.invoiceCounter.upsert({
    where: { prefix },
    create: { prefix, seq: 1 },
    update: { seq: { increment: 1 } },
  })
  return `${prefix}-${String(counter.seq).padStart(4, '0')}`
}
