import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MatchAndPost } from '@/components/admin/MatchAndPost'

export const dynamic = 'force-dynamic'

export default async function AdminMatchPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  return (
    <div className="min-h-screen bg-obsidian pt-[72px]">
      <div className="max-w-5xl mx-auto px-8 py-12">
        <Link href="/admin/investors" className="font-sans text-xs uppercase tracking-widest text-stone hover:text-gold transition-colors mb-4 inline-block">
          ← Back to investors
        </Link>
        <h1 className="font-serif text-4xl font-light text-ivory mb-2">Match &amp; Post Deal</h1>
        <p className="font-sans text-sm text-stone mb-10 max-w-xl">
          Enter the deal&apos;s price (and optionally area / strategy). We&apos;ll find every
          ACTIVE_INVESTOR whose budget covers it, then let you post the deal to them in one shot.
        </p>
        <MatchAndPost />
      </div>
    </div>
  )
}
