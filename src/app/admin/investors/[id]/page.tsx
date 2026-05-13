import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { StatusPanel } from '@/components/admin/StatusPanel'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminInvestorDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const app = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      investorProfile: {
        include: { user: { select: { email: true } } },
      },
      documents: { orderBy: { uploadedAt: 'desc' } },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!app) redirect('/admin/investors')

  const p = app.investorProfile
  const fmt = (n: number) => `£${Number(n).toLocaleString('en-GB')}`

  return (
    <div>
      <Link href="/admin/investors" className="font-sans text-xs uppercase tracking-widest text-stone hover:text-gold transition-colors mb-4 inline-block">
        ← Back to List
      </Link>
      <h1 className="font-serif text-4xl font-light text-ivory mb-8">
        {p.firstName} {p.lastName}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="border border-carbon p-6 space-y-3">
          <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Investor Profile</h2>
          {([
            ['Email', p.user.email],
            ['Phone', p.phone],
            ['Address', `${p.addressLine1}, ${p.city} ${p.postcode}`],
            ['Budget', `${fmt(Number(p.budgetMin))} – ${fmt(Number(p.budgetMax))}`],
            ['Strategy', p.strategy],
            ['Buyer Type', p.buyerType],
            ['Target Areas', p.targetAreas],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label}>
              <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone">{label}</p>
              <p className="font-sans text-sm text-ivory">{value}</p>
            </div>
          ))}
        </div>

        <div className="border border-carbon p-6">
          <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">KYC Documents</h2>
          {app.documents.length === 0 ? (
            <p className="font-sans text-xs text-stone">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {app.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between border-b border-carbon/50 pb-2">
                  <div>
                    <p className="font-sans text-xs text-ivory">{doc.type.replace(/_/g, ' ')}</p>
                    <p className="font-sans text-[0.55rem] text-stone">{doc.fileName}</p>
                  </div>
                  <a
                    href={`/api/admin/documents/${doc.id}/url`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans text-[0.6rem] uppercase tracking-widest text-gold hover:text-ivory transition-colors"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border border-carbon p-6">
          <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Status & Actions</h2>
          <StatusPanel
            applicationId={app.id}
            currentStatus={app.status}
            adminNotes={app.adminNotes}
          />
        </div>
      </div>
    </div>
  )
}
