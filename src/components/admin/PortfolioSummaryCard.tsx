import Link from 'next/link'

interface PropertySummary {
  id: string
  address: string
  purchasePrice: number
  currentValueEstimate: number | null
  completionDate: string
  tenancyStatus: string
}

interface Props {
  userId: string
  properties: PropertySummary[]
}

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export function PortfolioSummaryCard({ userId, properties }: Props) {
  if (properties.length === 0) return null

  const totalPurchase = properties.reduce((sum, p) => sum + p.purchasePrice, 0)
  const totalValue = properties.reduce((sum, p) => sum + (p.currentValueEstimate ?? p.purchasePrice), 0)
  const tenanted = properties.filter((p) => p.tenancyStatus === 'LET').length
  const lastCompletion = properties
    .map((p) => p.completionDate)
    .sort()
    .at(-1)!

  return (
    <div className="mt-8 border border-carbon p-6">
      <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Portfolio</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div>
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">Properties</p>
          <p className="font-sans text-2xl text-ivory">{properties.length}</p>
        </div>
        <div>
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">Total purchase</p>
          <p className="font-sans text-2xl text-ivory">{fmt(totalPurchase)}</p>
        </div>
        <div>
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">Est. value</p>
          <p className="font-sans text-2xl text-gold">{fmt(totalValue)}</p>
        </div>
        <div>
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">Tenanted</p>
          <p className="font-sans text-2xl text-ivory">{tenanted} / {properties.length}</p>
        </div>
      </div>

      <p className="font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-3">
        Latest completion · {fmtDate(lastCompletion)}
      </p>

      <ul className="space-y-2">
        {properties.slice(0, 5).map((p) => (
          <li key={p.id} className="grid grid-cols-12 gap-2 font-sans text-xs items-center border-l-2 border-carbon pl-3">
            <span className="col-span-6 text-ivory truncate">{p.address}</span>
            <span className="col-span-2 text-stone">{fmtDate(p.completionDate)}</span>
            <span className="col-span-2 text-stone">{fmt(p.purchasePrice)}</span>
            <span className="col-span-2 text-[0.55rem] uppercase tracking-widest text-stone">{p.tenancyStatus}</span>
          </li>
        ))}
      </ul>

      <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mt-4">
        Investor user id: <span className="font-mono normal-case">{userId.slice(0, 12)}…</span> · {' '}
        <Link href={`/admin/audit?resourceId=${userId}`} className="text-gold hover:text-ivory transition-colors normal-case tracking-normal">
          audit
        </Link>
      </p>
    </div>
  )
}
