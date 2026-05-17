import { calculateFinancials } from '@/lib/sdlt'

interface Props {
  offerAmount: number
  depositPercent: number
  financingSource: string
  taxResidency: string | null
  entityType: string | null
}

const fmt = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`

export function FinancialSummary({ offerAmount, depositPercent, financingSource, taxResidency, entityType }: Props) {
  const isNonResident = (taxResidency ?? 'GB') !== 'GB'
  // Ltd companies are always treated as additional-property purchases for SDLT.
  // Individual investors: assumed to already own at least one property (this is an
  // investment platform — true second-property surcharge will apply in most cases).
  const isAdditionalProperty = entityType !== 'INDIVIDUAL' || true

  const f = calculateFinancials({
    offerAmount, depositPercent, financingSource,
    isAdditionalProperty, isNonResident,
  })

  return (
    <div className="border border-carbon p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Offer amount</p>
          <p className="font-sans text-base text-ivory">{fmt(f.offerAmount)}</p>
        </div>
        <div>
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Deposit ({depositPercent}%)</p>
          <p className="font-sans text-base text-ivory">{fmt(f.depositAmount)}</p>
        </div>
        <div>
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Balance due</p>
          <p className="font-sans text-base text-ivory">{fmt(f.balanceDue)}</p>
          <p className="font-sans text-[0.6rem] text-stone mt-0.5">
            {financingSource === 'CASH' ? 'Paid by buyer at completion' : 'Funded by mortgage'}
          </p>
        </div>
        <div>
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">Est. legal fees</p>
          <p className="font-sans text-base text-ivory">{fmt(f.legalFees)}</p>
        </div>
      </div>

      <div className="border-t border-carbon pt-4">
        <div className="flex items-start justify-between gap-4">
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-gold">Estimated SDLT</p>
          <p className="font-sans text-lg text-gold">{fmt(f.sdlt.total)}</p>
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between font-sans text-xs text-stone">
            <span>Standard residential rates</span><span>{fmt(f.sdlt.standard)}</span>
          </div>
          {f.sdlt.additionalPropertySurcharge > 0 && (
            <div className="flex justify-between font-sans text-xs text-stone">
              <span>+5% additional-property surcharge</span><span>{fmt(f.sdlt.additionalPropertySurcharge)}</span>
            </div>
          )}
          {f.sdlt.nonResidentSurcharge > 0 && (
            <div className="flex justify-between font-sans text-xs text-stone">
              <span>+2% non-resident surcharge</span><span>{fmt(f.sdlt.nonResidentSurcharge)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gold pt-4">
        <div className="flex justify-between items-baseline">
          <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">Total cash required at completion</p>
          <p className="font-sans text-xl text-gold">{fmt(f.totalCashRequired)}</p>
        </div>
        <p className="font-sans text-[0.6rem] text-stone mt-1 leading-relaxed">
          {financingSource === 'CASH'
            ? 'Cash buyer: full balance + SDLT + legal fees.'
            : 'Mortgage buyer: deposit + SDLT + legal fees. Mortgage funds the balance.'}
        </p>
      </div>

      <p className="font-sans text-[0.55rem] text-stone/70 leading-relaxed border-t border-carbon pt-3">
        Estimate only — England &amp; Northern Ireland SDLT. Scotland (LBTT) and Wales (LTT) differ.
        Final figures confirmed by your solicitor. Legal fees are a typical-deal placeholder; your
        solicitor will quote precisely.
      </p>
    </div>
  )
}
