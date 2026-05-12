import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { StatusTimeline } from '@/components/portal/StatusTimeline'
import Link from 'next/link'

export default async function PortalStatusPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      investorProfile: {
        include: {
          application: {
            include: {
              statusHistory: { orderBy: { createdAt: 'asc' } },
            },
          },
        },
      },
    },
  })

  if (!user?.investorProfile?.application) {
    return <p className="font-sans text-sm text-stone">No application found.</p>
  }

  const app = user.investorProfile.application

  return (
    <div>
      <h1 className="font-serif text-4xl font-light text-ivory mb-2">
        Welcome, {user.investorProfile.firstName}
      </h1>
      <p className="font-sans text-sm text-stone mb-12">
        Your application status is shown below.
      </p>

      <StatusTimeline
        currentStatus={app.status}
        history={app.statusHistory.map((h) => ({
          id: h.id,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          note: h.note,
          createdAt: h.createdAt.toISOString(),
        }))}
      />

      {app.status === 'DOCUMENTS_REQUESTED' && (
        <div className="mt-8 p-6 border border-gold bg-gold/5">
          <p className="font-sans text-sm text-ivory mb-4">
            We need you to upload your KYC documents to proceed.
          </p>
          <Link
            href="/portal/documents"
            className="inline-block px-8 py-3.5 text-xs font-semibold uppercase tracking-widest border border-gold text-gold hover:bg-gold hover:text-obsidian transition-colors"
          >
            Upload Documents &rarr;
          </Link>
        </div>
      )}
    </div>
  )
}
