// Simplified UK SDLT (Stamp Duty Land Tax) estimator — England & Northern Ireland residential.
// Estimate only — always recommend the user confirms with their solicitor before exchange.
// Scotland uses LBTT and Wales uses LTT; not covered here.

interface SdltBand {
  upTo: number   // upper bound of band (exclusive); Infinity for top band
  rate: number   // decimal e.g. 0.05 for 5%
}

// Standard residential SDLT bands (as of 2025 — verify before relying on this in production)
const RESIDENTIAL_BANDS: SdltBand[] = [
  { upTo: 250_000, rate: 0.00 },
  { upTo: 925_000, rate: 0.05 },
  { upTo: 1_500_000, rate: 0.10 },
  { upTo: Infinity, rate: 0.12 },
]

/** 5% additional-property surcharge applies to all purchases by a company,
 *  and to any second residential property by an individual. */
const ADDITIONAL_PROPERTY_SURCHARGE = 0.05

/** 2% non-resident surcharge applies if buyer is non-UK resident for tax. */
const NON_RESIDENT_SURCHARGE = 0.02

export interface SdltInputs {
  /** Purchase price in £. */
  price: number
  /** True if this triggers the +5% surcharge (Ltd company always; individual 2nd-property). */
  isAdditionalProperty: boolean
  /** True if buyer's tax residency is non-GB. */
  isNonResident: boolean
}

export interface SdltBreakdown {
  /** Total SDLT due in £. */
  total: number
  /** Standard SDLT before surcharges. */
  standard: number
  /** Amount added by the 5% additional-property surcharge. */
  additionalPropertySurcharge: number
  /** Amount added by the 2% non-resident surcharge. */
  nonResidentSurcharge: number
}

function standardSdlt(price: number): number {
  let remaining = price
  let lowerBound = 0
  let total = 0
  for (const band of RESIDENTIAL_BANDS) {
    if (remaining <= 0) break
    const bandWidth = band.upTo - lowerBound
    const taxable = Math.min(remaining, bandWidth)
    total += taxable * band.rate
    remaining -= taxable
    lowerBound = band.upTo
  }
  return total
}

export function calculateSdlt({ price, isAdditionalProperty, isNonResident }: SdltInputs): SdltBreakdown {
  if (price <= 0) {
    return { total: 0, standard: 0, additionalPropertySurcharge: 0, nonResidentSurcharge: 0 }
  }
  const standard = standardSdlt(price)
  const additionalPropertySurcharge = isAdditionalProperty ? price * ADDITIONAL_PROPERTY_SURCHARGE : 0
  const nonResidentSurcharge = isNonResident ? price * NON_RESIDENT_SURCHARGE : 0
  const total = standard + additionalPropertySurcharge + nonResidentSurcharge
  return { total, standard, additionalPropertySurcharge, nonResidentSurcharge }
}

/** Rough estimate for residential conveyancing legal fees (incl. VAT and typical disbursements).
 *  Real-world fees vary widely — solicitor will quote precisely. */
export const ESTIMATED_LEGAL_FEES = 1800

export interface FinancialBreakdown {
  offerAmount: number
  depositAmount: number
  balanceDue: number
  sdlt: SdltBreakdown
  legalFees: number
  totalCashRequired: number
}

/** Sum the buyer's cash-out at completion: deposit + estimated SDLT + estimated legal fees.
 *  Mortgage covers the (balance - deposit) gap, so cash buyers pay the full balance. */
export function calculateFinancials(params: {
  offerAmount: number
  depositPercent: number
  financingSource: string   // CASH | MORTGAGE | MIXED
  isAdditionalProperty: boolean
  isNonResident: boolean
}): FinancialBreakdown {
  const { offerAmount, depositPercent, financingSource, isAdditionalProperty, isNonResident } = params
  const depositAmount = Math.round((offerAmount * depositPercent) / 100)
  const balanceDue = offerAmount - depositAmount
  const sdlt = calculateSdlt({ price: offerAmount, isAdditionalProperty, isNonResident })
  const legalFees = ESTIMATED_LEGAL_FEES
  // Cash buyer = full balance at completion. Mortgage / mixed = lender funds the balance,
  // buyer covers deposit + SDLT + fees.
  const cashAtCompletion = financingSource === 'CASH' ? balanceDue : 0
  const totalCashRequired = depositAmount + cashAtCompletion + sdlt.total + legalFees
  return { offerAmount, depositAmount, balanceDue, sdlt, legalFees, totalCashRequired }
}
