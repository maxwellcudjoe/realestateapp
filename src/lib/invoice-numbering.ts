import { prisma } from '@/lib/prisma'
import { INVOICE_NUMBER_PREFIX } from '@/lib/invoices'

/**
 * Generates the next sequential invoice number for the current year:
 * RB-YYYY-NNNN, padded to 4 digits.
 *
 * Reads the highest existing number for the year and increments. Collision-safe
 * because the column has a UNIQUE constraint — caller should retry on P2002.
 *
 * Server-only (Prisma) — kept out of `@/lib/invoices` so client components
 * can safely import the rest of the invoice helpers without dragging mssql
 * into the browser bundle.
 */
export async function nextInvoiceNumber(now: Date = new Date()): Promise<string> {
  const year = now.getFullYear()
  const prefix = `${INVOICE_NUMBER_PREFIX}-${year}-`
  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  })
  const lastSeq = last ? Number(last.invoiceNumber.slice(prefix.length)) : 0
  const next = Number.isFinite(lastSeq) ? lastSeq + 1 : 1
  return `${prefix}${String(next).padStart(4, '0')}`
}
