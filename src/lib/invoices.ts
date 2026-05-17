// Pure browser-safe invoice helpers and types. Server-only invoice numbering
// lives in `@/lib/invoice-numbering` to keep this module free of Prisma
// (importing Prisma here would force tedious/mssql into client bundles).

export const INVOICE_TYPES = ['SOURCING', 'SUCCESS', 'SUBSCRIPTION'] as const
export type InvoiceType = (typeof INVOICE_TYPES)[number]

export const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'VOID'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export const INVOICE_NUMBER_PREFIX = 'RB'

/** Reads REVE_BATIR_SUCCESS_FEE_PCT and returns a percent (e.g. 1.5). Defaults to 1.5. */
export function successFeePercent(): number {
  const raw = process.env.REVE_BATIR_SUCCESS_FEE_PCT
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : 1.5
}

/** Calculates the success fee for a given purchase price (= price × pct%). */
export function calculateSuccessFee(purchasePrice: number, pct: number = successFeePercent()): number {
  if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) return 0
  return Math.round((purchasePrice * pct) / 100 * 100) / 100
}

/** Default due-date offset for new invoices (14 days). */
export const INVOICE_DUE_DAYS = 14

export function defaultDueDate(issued: Date = new Date()): Date {
  const due = new Date(issued)
  due.setDate(due.getDate() + INVOICE_DUE_DAYS)
  return due
}

/** Valid status transitions. */
const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ['SENT', 'VOID'],
  SENT: ['PAID', 'VOID'],
  PAID: [],
  VOID: [],
}

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

export interface BankDetails {
  bankName: string
  sortCode: string
  accountNumber: string
  accountName: string
  vatNumber?: string
}

export function getBankDetails(): BankDetails {
  return {
    bankName: process.env.REVE_BATIR_BANK_NAME ?? 'Lloyds Bank',
    sortCode: process.env.REVE_BATIR_BANK_SORT_CODE ?? '00-00-00',
    accountNumber: process.env.REVE_BATIR_BANK_ACCOUNT ?? '00000000',
    accountName: process.env.REVE_BATIR_BANK_ACCOUNT_NAME ?? 'Reve Batir Ltd',
    vatNumber: process.env.REVE_BATIR_VAT_NUMBER,
  }
}

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  SOURCING: 'Sourcing Fee',
  SUCCESS: 'Success Fee',
  SUBSCRIPTION: 'Premium Subscription',
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PAID: 'Paid',
  VOID: 'Void',
}
