import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LeadForm } from '@/components/admin/LeadForm'

export const dynamic = 'force-dynamic'

export default async function NewLeadPage() {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/login')

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Create lead</h1>
      <LeadForm mode="create" />
    </div>
  )
}
