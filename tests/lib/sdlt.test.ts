import { describe, it, expect } from 'vitest'
import { calculateSdlt, calculateFinancials, ESTIMATED_LEGAL_FEES } from '@/lib/sdlt'

describe('calculateSdlt — standard residential bands', () => {
  it('returns zero for £0', () => {
    expect(calculateSdlt({ price: 0, isAdditionalProperty: false, isNonResident: false }).total).toBe(0)
  })

  it('returns zero up to the £250k threshold', () => {
    const r = calculateSdlt({ price: 250_000, isAdditionalProperty: false, isNonResident: false })
    expect(r.standard).toBe(0)
    expect(r.total).toBe(0)
  })

  it('charges 5% on the £250k–£925k band only', () => {
    // £300k → 5% × £50k = £2,500
    const r = calculateSdlt({ price: 300_000, isAdditionalProperty: false, isNonResident: false })
    expect(r.standard).toBe(2_500)
  })

  it('crosses the £925k boundary correctly', () => {
    // £1,000,000 → 5% × £675k + 10% × £75k = £33,750 + £7,500 = £41,250
    const r = calculateSdlt({ price: 1_000_000, isAdditionalProperty: false, isNonResident: false })
    expect(r.standard).toBe(41_250)
  })
})

describe('calculateSdlt — surcharges', () => {
  it('applies +5% on the full price for additional property', () => {
    const r = calculateSdlt({ price: 300_000, isAdditionalProperty: true, isNonResident: false })
    expect(r.additionalPropertySurcharge).toBe(15_000)
    expect(r.total).toBe(r.standard + 15_000)
  })

  it('applies +2% on the full price for non-resident', () => {
    const r = calculateSdlt({ price: 300_000, isAdditionalProperty: false, isNonResident: true })
    expect(r.nonResidentSurcharge).toBe(6_000)
    expect(r.total).toBe(r.standard + 6_000)
  })

  it('stacks both surcharges when applicable', () => {
    const r = calculateSdlt({ price: 300_000, isAdditionalProperty: true, isNonResident: true })
    expect(r.total).toBe(r.standard + 15_000 + 6_000)
  })
})

describe('calculateFinancials', () => {
  it('cash buyer pays full balance + SDLT + fees at completion', () => {
    const r = calculateFinancials({
      offerAmount: 250_000, depositPercent: 25,
      financingSource: 'CASH', isAdditionalProperty: true, isNonResident: false,
    })
    // deposit = 62,500; balance = 187,500; SDLT = 0 + 5% × 250k = 12,500; legal = 1,800
    // cash @ completion: deposit + balance + sdlt + legal = 62,500 + 187,500 + 12,500 + 1,800 = 264,300
    expect(r.depositAmount).toBe(62_500)
    expect(r.balanceDue).toBe(187_500)
    expect(r.sdlt.total).toBe(12_500)
    expect(r.legalFees).toBe(ESTIMATED_LEGAL_FEES)
    expect(r.totalCashRequired).toBe(62_500 + 187_500 + 12_500 + ESTIMATED_LEGAL_FEES)
  })

  it('mortgage buyer pays deposit + SDLT + fees only (mortgage funds balance)', () => {
    const r = calculateFinancials({
      offerAmount: 250_000, depositPercent: 25,
      financingSource: 'MORTGAGE', isAdditionalProperty: true, isNonResident: false,
    })
    // deposit = 62,500; SDLT = 12,500; legal = 1,800 → 76,800
    expect(r.totalCashRequired).toBe(62_500 + 12_500 + ESTIMATED_LEGAL_FEES)
  })
})
