import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { InvoiceIssuer } from '@/components/admin/InvoiceIssuer'
import { InvoiceMarkPaid } from '@/components/admin/InvoiceMarkPaid'
import { INVOICE_TYPE_LABELS, INVOICE_STATUS_LABELS, type InvoiceType, type InvoiceStatus } from '@/lib/invoices'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (d: Date | null) =>
  d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default async function AdminInvestorInvoicesPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      investorProfile: {
        include: {
          user: {
            include: {
              invoices: {
                orderBy: { createdAt: 'desc' },
                include: { deal: { select: { address: true } } },
              },
            },
          },
        },
      },
    },
  })
  if (!application) redirect('/admin/investors')

  const user = application.investorProfile.user
  const invoices = user.invoices

  const outstanding = invoices
    .filter((i) => i.status === 'SENT')
    .reduce((sum, i) => sum + Number(i.amount), 0)
  const lifetimePaid = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((sum, i) => sum + Number(i.amount), 0)

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="border border-carbon p-5">
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">Outstanding</p>
            <p className={`font-sans text-2xl ${outstanding > 0 ? 'text-gold' : 'text-stone'}`}>{fmt(outstanding)}</p>
          </div>
          <div className="border border-carbon p-5">
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone mb-1">Lifetime paid</p>
            <p className="font-sans text-2xl text-ivory">{fmt(lifetimePaid)}</p>
          </div>
        </div>

        <div className="mb-8">
          <InvoiceIssuer userId={user.id} triggerLabel="New invoice" />
        </div>

        {invoices.length === 0 ? (
          <p className="font-sans text-sm text-stone">No invoices issued yet.</p>
        ) : (
          <div className="border border-carbon">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-carbon font-sans text-[0.55rem] uppercase tracking-widest text-stone">
              <div className="col-span-2">Number</div>
              <div className="col-span-3">Type / Deal</div>
              <div className="col-span-2">Issued / Due</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-3">Actions</div>
            </div>
            {invoices.map((i) => {
              const isOverdue = i.status === 'SENT' && i.dueAt && i.dueAt < new Date()
              return (
                <div key={i.id} className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-carbon/60 last:border-b-0 items-center">
                  <div className="col-span-2">
                    <a href={`/api/admin/invoices/${i.id}/pdf`} target="_blank" rel="noopener noreferrer" className="font-sans text-sm text-gold hover:underline">
                      {i.invoiceNumber}
                    </a>
                  </div>
                  <div className="col-span-3">
                    <p className="font-sans text-sm text-ivory">{INVOICE_TYPE_LABELS[i.type as InvoiceType]}</p>
                    {i.deal?.address && (
                      <p className="font-sans text-[0.65rem] text-stone mt-0.5">{i.deal.address}</p>
                    )}
                  </div>
                  <div className="col-span-2 font-sans text-xs text-stone">
                    <p>{fmtDate(i.issuedAt)}</p>
                    <p>Due {fmtDate(i.dueAt)}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="font-sans text-sm text-ivory">{fmt(Number(i.amount))}</p>
                    <span className={`font-sans text-[0.55rem] uppercase tracking-widest ${
                      i.status === 'PAID' ? 'text-green-400'
                        : i.status === 'VOID' ? 'text-stone/60'
                          : isOverdue ? 'text-red-400'
                            : 'text-gold'
                    }`}>
                      {i.status === 'SENT' && isOverdue ? 'Overdue' : INVOICE_STATUS_LABELS[i.status as InvoiceStatus]}
                    </span>
                  </div>
                  <div className="col-span-3">
                    {i.status === 'SENT' && (
                      <InvoiceMarkPaid invoiceId={i.id} invoiceNumber={i.invoiceNumber} />
                    )}
                    {i.status === 'PAID' && i.paidReference && (
                      <p className="font-sans text-[0.65rem] text-stone">Ref: <span className="text-ivory">{i.paidReference}</span></p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}
