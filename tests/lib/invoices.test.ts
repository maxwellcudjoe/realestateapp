import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockInvoiceFindFirst } = vi.hoisted(() => ({ mockInvoiceFindFirst: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: { invoice: { findFirst: mockInvoiceFindFirst } },
}))

import {
  INVOICE_TYPES,
  INVOICE_STATUSES,
  successFeePercent,
  calculateSuccessFee,
  defaultDueDate,
  canTransition,
  getBankDetails,
  INVOICE_TYPE_LABELS,
  INVOICE_STATUS_LABELS,
} from '@/lib/invoices'
import { nextInvoiceNumber } from '@/lib/invoice-numbering'

describe('invoices lib', () => {
  beforeEach(() => vi.clearAllMocks())

  afterEach(() => {
    delete process.env.REVE_BATIR_SUCCESS_FEE_PCT
    delete process.env.REVE_BATIR_BANK_NAME
    delete process.env.REVE_BATIR_VAT_NUMBER
  })

  describe('constants', () => {
    it('exports three invoice types', () => {
      expect(INVOICE_TYPES).toEqual(['SOURCING', 'SUCCESS', 'SUBSCRIPTION'])
    })
    it('exports four invoice statuses', () => {
      expect(INVOICE_STATUSES).toEqual(['DRAFT', 'SENT', 'PAID', 'VOID'])
    })
    it('has labels for every type', () => {
      for (const t of INVOICE_TYPES) expect(INVOICE_TYPE_LABELS[t]).toBeTruthy()
    })
    it('has labels for every status', () => {
      for (const s of INVOICE_STATUSES) expect(INVOICE_STATUS_LABELS[s]).toBeTruthy()
    })
  })

  describe('successFeePercent', () => {
    it('defaults to 1.5 when env unset', () => {
      expect(successFeePercent()).toBe(1.5)
    })
    it('reads env var when set', () => {
      process.env.REVE_BATIR_SUCCESS_FEE_PCT = '2.5'
      expect(successFeePercent()).toBe(2.5)
    })
    it('falls back to 1.5 on garbage env', () => {
      process.env.REVE_BATIR_SUCCESS_FEE_PCT = 'oops'
      expect(successFeePercent()).toBe(1.5)
    })
    it('falls back to 1.5 on zero/negative', () => {
      process.env.REVE_BATIR_SUCCESS_FEE_PCT = '0'
      expect(successFeePercent()).toBe(1.5)
      process.env.REVE_BATIR_SUCCESS_FEE_PCT = '-1'
      expect(successFeePercent()).toBe(1.5)
    })
  })

  describe('calculateSuccessFee', () => {
    it('returns price × pct / 100, rounded to 2dp', () => {
      expect(calculateSuccessFee(250000, 1.5)).toBe(3750)
      expect(calculateSuccessFee(333333, 1.5)).toBe(5000)
    })
    it('returns 0 for non-positive prices', () => {
      expect(calculateSuccessFee(0)).toBe(0)
      expect(calculateSuccessFee(-1)).toBe(0)
      expect(calculateSuccessFee(Number.NaN)).toBe(0)
    })
  })

  describe('defaultDueDate', () => {
    it('returns 14 days after issued date', () => {
      const issued = new Date('2026-06-01T00:00:00Z')
      const due = defaultDueDate(issued)
      expect(due.toISOString()).toBe('2026-06-15T00:00:00.000Z')
    })
  })

  describe('canTransition', () => {
    it('allows DRAFT → SENT and DRAFT → VOID', () => {
      expect(canTransition('DRAFT', 'SENT')).toBe(true)
      expect(canTransition('DRAFT', 'VOID')).toBe(true)
    })
    it('allows SENT → PAID and SENT → VOID', () => {
      expect(canTransition('SENT', 'PAID')).toBe(true)
      expect(canTransition('SENT', 'VOID')).toBe(true)
    })
    it('disallows transitions from terminal states', () => {
      expect(canTransition('PAID', 'VOID')).toBe(false)
      expect(canTransition('PAID', 'SENT')).toBe(false)
      expect(canTransition('VOID', 'SENT')).toBe(false)
    })
    it('disallows DRAFT → PAID (must go via SENT)', () => {
      expect(canTransition('DRAFT', 'PAID')).toBe(false)
    })
  })

  describe('nextInvoiceNumber', () => {
    it('returns RB-YYYY-0001 when no invoices exist', async () => {
      mockInvoiceFindFirst.mockResolvedValue(null)
      const num = await nextInvoiceNumber(new Date('2026-05-17T00:00:00Z'))
      expect(num).toBe('RB-2026-0001')
    })
    it('increments the last sequence for the current year', async () => {
      mockInvoiceFindFirst.mockResolvedValue({ invoiceNumber: 'RB-2026-0042' })
      const num = await nextInvoiceNumber(new Date('2026-05-17T00:00:00Z'))
      expect(num).toBe('RB-2026-0043')
    })
    it('pads sequences below 1000 to 4 digits', async () => {
      mockInvoiceFindFirst.mockResolvedValue({ invoiceNumber: 'RB-2026-0009' })
      const num = await nextInvoiceNumber(new Date('2026-05-17T00:00:00Z'))
      expect(num).toBe('RB-2026-0010')
    })
  })

  describe('getBankDetails', () => {
    it('returns env values when set', () => {
      process.env.REVE_BATIR_BANK_NAME = 'NatWest'
      process.env.REVE_BATIR_VAT_NUMBER = 'GB123456789'
      const b = getBankDetails()
      expect(b.bankName).toBe('NatWest')
      expect(b.vatNumber).toBe('GB123456789')
    })
    it('falls back to safe defaults when unset', () => {
      const b = getBankDetails()
      expect(b.bankName).toBe('Lloyds Bank')
      expect(b.vatNumber).toBeUndefined()
    })
  })
})
