import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STAGES = [
  {
    n: '01',
    title: 'Application Review',
    body: 'Our team reviews your application within 48 hours. You’ll see the status update on your portal home.',
  },
  {
    n: '02',
    title: 'KYC Documents',
    body: 'When we’re ready, we’ll request your KYC documents (passport, proof of address, source of funds). The Documents tab unlocks at that stage.',
  },
  {
    n: '03',
    title: 'Approval & Activation',
    body: 'Once verified, your account becomes active and you’re added to our deal distribution list.',
  },
  {
    n: '04',
    title: 'Receive Matched Deals',
    body: 'Deal packs that match your criteria appear in your Deals tab. Respond inline — accept, request more info, or pass.',
  },
]

export default async function PortalWelcomePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { investorProfile: { select: { firstName: true } } },
  })

  const name = user?.investorProfile?.firstName ?? 'Investor'

  return (
    <div>
      <h1 className="font-serif text-4xl font-light text-ivory mb-3">
        Welcome, {name}
      </h1>
      <p className="font-sans text-sm text-stone mb-12 max-w-xl leading-relaxed">
        Your account is verified. Here&apos;s what happens next — from application review through to receiving your first matched deal pack.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-carbon mb-12">
        {STAGES.map(({ n, title, body }) => (
          <div key={n} className="bg-obsidian p-6 flex flex-col gap-3">
            <span className="font-serif text-4xl font-light text-carbon leading-none select-none">{n}</span>
            <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-ivory">{title}</h2>
            <p className="font-sans text-sm font-light text-stone leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/portal/status"
          className="inline-block px-8 py-3.5 text-xs font-semibold uppercase tracking-widest border border-gold text-gold hover:bg-gold hover:text-obsidian transition-colors text-center"
        >
          Continue to my portal &rarr;
        </Link>
        <Link
          href="/portal/profile"
          className="inline-block px-8 py-3.5 text-xs font-semibold uppercase tracking-widest border border-carbon text-stone hover:border-gold hover:text-gold transition-colors text-center"
        >
          Review my profile
        </Link>
      </div>
    </div>
  )
}
