import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { LeadForm } from '@/components/admin/LeadForm'
import { LeadNoteThread } from '@/components/admin/LeadNoteThread'
import { ConvertLeadButton } from '@/components/admin/ConvertLeadButton'
import { parseCodesJson } from '@/lib/leads/source'

export const dynamic = 'force-dynamic'

interface PageProps { params: { id: string } }

export default async function LeadDetailPage({ params }: PageProps) {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/login')

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: { notes: { orderBy: { createdAt: 'desc' } } },
  })
  if (!lead) notFound()

  const initial = {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    sourceChannel: lead.sourceChannel,
    sourceReferrer: lead.sourceReferrer,
    sourceNote: lead.sourceNote,
    strategyCodes: parseCodesJson(lead.strategyCodesJson),
    targetAreaCodes: parseCodesJson(lead.targetAreaCodesJson),
    budgetMin: lead.budgetMin ? Number(lead.budgetMin) : null,
    budgetMax: lead.budgetMax ? Number(lead.budgetMax) : null,
    experienceLevel: lead.experienceLevel,
    timeline: lead.timeline,
    fundingStatus: lead.fundingStatus,
    status: lead.status,
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/admin/leads" className="text-xs text-stone hover:text-ivory transition-colors">← all leads</Link>
          <h1 className="text-2xl font-semibold text-ivory">{lead.name}</h1>
          <p className="text-sm text-stone">Captured {new Date(lead.createdAt).toLocaleString('en-GB')}</p>
        </div>
        <ConvertLeadButton leadId={lead.id} alreadyConverted={!!lead.convertedUserId} leadEmail={lead.email} />
      </header>
      <section>
        <h2 className="text-lg font-medium mb-2 text-ivory">Lead details</h2>
        <LeadForm mode="edit" initial={initial} />
      </section>
      <section>
        <h2 className="text-lg font-medium mb-2 text-ivory">Notes</h2>
        <LeadNoteThread
          leadId={lead.id}
          notes={lead.notes.map((n) => ({ id: n.id, body: n.body, createdAt: n.createdAt.toISOString(), authorUserId: n.authorUserId }))}
        />
      </section>
    </div>
  )
}
