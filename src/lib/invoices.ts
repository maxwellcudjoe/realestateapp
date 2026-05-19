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
  if (Number.isFinite(n) && n > 0) return n
  if (typeof window === 'undefined') warnUnsetOnce('REVE_BATIR_SUCCESS_FEE_PCT', '1.5')
  return 1.5
}

// L4 — log a warning at most once per cold start when a REVE_BATIR_* env var
// is missing, so misconfigured deploys are visible in Azure App Insights /
// Log stream without spamming every request.
const warnedEnvKeys = new Set<string>()
function warnUnsetOnce(key: string, defaultValue: string) {
  if (warnedEnvKeys.has(key)) return
  warnedEnvKeys.add(key)
  console.warn(`[config] ${key} unset — using default "${defaultValue}". Set it in Azure SWA Application settings if you need a custom value.`)
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
  if (typeof window === 'undefined') {
    if (!process.env.REVE_BATIR_BANK_NAME) warnUnsetOnce('REVE_BATIR_BANK_NAME', 'Lloyds Bank')
    if (!process.env.REVE_BATIR_BANK_SORT_CODE) warnUnsetOnce('REVE_BATIR_BANK_SORT_CODE', '00-00-00')
    if (!process.env.REVE_BATIR_BANK_ACCOUNT) warnUnsetOnce('REVE_BATIR_BANK_ACCOUNT', '00000000')
    if (!process.env.REVE_BATIR_BANK_ACCOUNT_NAME) warnUnsetOnce('REVE_BATIR_BANK_ACCOUNT_NAME', 'Reve Batir Ltd')
  }
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
