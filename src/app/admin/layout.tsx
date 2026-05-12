import { SectionLabel } from '@/components/ui/SectionLabel'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-obsidian pt-[72px]">
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <SectionLabel>Operations Dashboard</SectionLabel>
          <nav className="flex gap-6">
            <Link href="/admin/investors" className="font-sans text-[0.6rem] uppercase tracking-widest text-stone hover:text-ivory transition-colors">
              Investors
            </Link>
          </nav>
        </div>
        {children}
      </div>
    </div>
  )
}
