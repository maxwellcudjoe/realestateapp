'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Investor {
  applicationId: string
  name: string
  email: string
  strategy: string
  budgetMin: number
  budgetMax: number
  buyerType: string
  status: string
  createdAt: string
  updatedAt: string
}

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'border-stone text-stone',
  UNDER_REVIEW: 'border-ivory/50 text-ivory/50',
  DOCUMENTS_REQUESTED: 'border-gold/60 text-gold/60',
  DOCUMENTS_RECEIVED: 'border-gold/60 text-gold/60',
  KYC_APPROVED: 'border-gold text-gold',
  ACTIVE_INVESTOR: 'border-gold text-gold',
  DEAL_SENT: 'border-ivory text-ivory',
}

const FIELD_CLASS =
  'bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold focus-visible:ring-1 focus-visible:ring-gold transition-colors'

export function InvestorTable({ investors }: { investors: Investor[] }) {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const filtered = investors.filter((inv) => {
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!inv.name.toLowerCase().includes(q) && !inv.email.toLowerCase().includes(q)) return false
    }
    return true
  })

  const fmt = (n: number) => `£${n.toLocaleString('en-GB')}`

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={FIELD_CLASS}
        >
          <option value="ALL">All Statuses</option>
          {Object.keys(STATUS_COLORS).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className={`${FIELD_CLASS} flex-1 min-w-[200px]`}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-carbon">
              {['Name', 'Email', 'Strategy', 'Budget', 'Status', 'Submitted', ''].map((h) => (
                <th key={h} className="font-sans text-[0.6rem] uppercase tracking-widest text-stone pb-3 pr-4 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr key={inv.applicationId} className="border-b border-carbon/50 hover:bg-charcoal/50 transition-colors cursor-pointer group">
                <td className="py-3 pr-4 whitespace-nowrap">
                  <Link href={`/admin/investors/${inv.applicationId}`} className="font-sans text-sm text-ivory group-hover:text-gold transition-colors">
                    {inv.name}
                  </Link>
                </td>
                <td className="py-3 pr-4 font-sans text-xs text-stone whitespace-nowrap">
                  <Link href={`/admin/investors/${inv.applicationId}`} className="block">{inv.email}</Link>
                </td>
                <td className="py-3 pr-4 font-sans text-xs text-stone whitespace-nowrap">
                  <Link href={`/admin/investors/${inv.applicationId}`} className="block">{inv.strategy}</Link>
                </td>
                <td className="py-3 pr-4 font-sans text-xs text-stone whitespace-nowrap">
                  <Link href={`/admin/investors/${inv.applicationId}`} className="block">{fmt(inv.budgetMin)} – {fmt(inv.budgetMax)}</Link>
                </td>
                <td className="py-3 pr-4">
                  <Link href={`/admin/investors/${inv.applicationId}`} className="block">
                    <span className={`inline-block px-2 py-0.5 text-[0.55rem] uppercase tracking-widest border ${STATUS_COLORS[inv.status] || 'border-stone text-stone'}`}>
                      {inv.status.replace(/_/g, ' ')}
                    </span>
                  </Link>
                </td>
                <td className="py-3 font-sans text-xs text-stone whitespace-nowrap">
                  <Link href={`/admin/investors/${inv.applicationId}`} className="block">
                    {new Date(inv.createdAt).toLocaleDateString('en-GB')}
                  </Link>
                </td>
                <td className="py-3 pl-4 whitespace-nowrap">
                  <Link
                    href={`/admin/investors/${inv.applicationId}`}
                    className="font-sans text-[0.6rem] uppercase tracking-widest text-gold hover:text-ivory transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Manage →
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center font-sans text-sm text-stone">
                  No investors found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
