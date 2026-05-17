import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS, type InvoiceType, type InvoiceStatus } from '@/lib/invoices'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (d: Date | null) =>
  d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default async function PortalInvoicesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id, status: { in: ['SENT', 'PAID'] } },
    orderBy: { createdAt: 'desc' },
    include: { deal: { select: { address: true } } },
  })

  const outstanding = invoices
    .filter((i) => i.status === 'SENT')
    .reduce((sum, i) => sum + Number(i.amount), 0)
  const now = new Date()
  const overdue = invoices.filter(
    (i) => i.status === 'SENT' && i.dueAt && i.dueAt < now,
  )

  return (
    <div>
      <h1 className="font-serif text-3xl font-light text-ivory mb-2">Invoices</h1>
      <p className="font-sans text-sm text-stone mb-8">
        Your fees from Rêve Bâtir — sourcing, success, and subscription invoices.
        Payment by bank transfer (details on each PDF).
      </p>

      {outstanding > 0 && (
        <section className="mb-8">
          <div className={`border p-5 ${overdue.length > 0 ? 'border-red-400/60 bg-red-400/5' : 'border-gold bg-gold/5'}`}>
            <p className={`font-sans text-[0.6rem] uppercase tracking-widest mb-2 ${overdue.length > 0 ? 'text-red-400' : 'text-gold'}`}>
              {overdue.length > 0 ? 'Overdue balance' : 'Outstanding balance'}
            </p>
            <p className="font-sans text-2xl text-ivory">{fmt(outstanding)}</p>
            {overdue.length > 0 && (
              <p className="font-sans text-xs text-red-400 mt-2">
                {overdue.length} invoice{overdue.length === 1 ? '' : 's'} past due — please settle as soon as possible.
              </p>
            )}
          </div>
        </section>
      )}

      {invoices.length === 0 ? (
        <p className="font-sans text-sm text-stone">No invoices yet.</p>
      ) : (
        <div className="border border-carbon">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-carbon font-sans text-[0.55rem] uppercase tracking-widest text-stone">
            <div className="col-span-2">Number</div>
            <div className="col-span-3">Type</div>
            <div className="col-span-3">Issued / Due</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-2 text-right">Status</div>
          </div>
          {invoices.map((i) => {
            const isOverdue = i.status === 'SENT' && i.dueAt && i.dueAt < now
            return (
              <a
                key={i.id}
                href={`/api/portal/invoices/${i.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-carbon/60 last:border-b-0 hover:bg-carbon/30 transition-colors items-center"
              >
                <div className="col-span-2 font-sans text-sm text-gold">{i.invoiceNumber}</div>
                <div className="col-span-3">
                  <p className="font-sans text-sm text-ivory">{INVOICE_TYPE_LABELS[i.type as InvoiceType]}</p>
                  {i.deal?.address && (
                    <p className="font-sans text-[0.65rem] text-stone mt-0.5">{i.deal.address}</p>
                  )}
                </div>
                <div className="col-span-3 font-sans text-xs text-stone">
                  <p>Issued {fmtDate(i.issuedAt)}</p>
                  <p>Due {fmtDate(i.dueAt)}</p>
                </div>
                <div className="col-span-2 text-right font-sans text-sm text-ivory">{fmt(Number(i.amount))}</div>
                <div className="col-span-2 text-right">
                  <span
                    className={`font-sans text-[0.55rem] uppercase tracking-widest ${
                      i.status === 'PAID'
                        ? 'text-green-400'
                        : isOverdue
                          ? 'text-red-400'
                          : 'text-gold'
                    }`}
                  >
                    {i.status === 'SENT' && isOverdue ? 'Overdue' : INVOICE_STATUS_LABELS[i.status as InvoiceStatus]}
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
