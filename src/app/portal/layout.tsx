import { SectionLabel } from '@/components/ui/SectionLabel'
import Link from 'next/link'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-obsidian pt-[72px]">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <SectionLabel>Investor Portal</SectionLabel>
          <nav className="flex gap-6">
            <Link href="/portal/status" className="font-sans text-[0.6rem] uppercase tracking-widest text-stone hover:text-ivory transition-colors">
              Status
            </Link>
            <Link href="/portal/documents" className="font-sans text-[0.6rem] uppercase tracking-widest text-stone hover:text-ivory transition-colors">
              Documents
            </Link>
          </nav>
        </div>
        {children}
      </div>
    </div>
  )
}
