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
  UNDER_REVIEW: 'border-blue-400 text-blue-400',
  DOCUMENTS_REQUESTED: 'border-amber-400 text-amber-400',
  DOCUMENTS_RECEIVED: 'border-amber-400 text-amber-400',
  KYC_APPROVED: 'border-gold text-gold',
  ACTIVE_INVESTOR: 'border-gold text-gold',
  DEAL_SENT: 'border-green-400 text-green-400',
}

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
          className="bg-[#1f1f1f] border border-carbon px-3 py-2 font-sans text-xs text-ivory focus:outline-none focus:border-gold"
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
          className="bg-[#1f1f1f] border border-carbon px-3 py-2 font-sans text-xs text-ivory focus:outline-none focus:border-gold flex-1 min-w-[200px]"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-carbon">
              {['Name', 'Email', 'Strategy', 'Budget', 'Status', 'Submitted'].map((h) => (
                <th key={h} className="font-sans text-[0.6rem] uppercase tracking-widest text-stone pb-3 pr-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr key={inv.applicationId} className="border-b border-carbon/50 hover:bg-charcoal/50 transition-colors">
                <td className="py-3 pr-4">
                  <Link href={`/admin/investors/${inv.applicationId}`} className="font-sans text-sm text-ivory hover:text-gold transition-colors">
                    {inv.name}
                  </Link>
                </td>
                <td className="py-3 pr-4 font-sans text-xs text-stone">{inv.email}</td>
                <td className="py-3 pr-4 font-sans text-xs text-stone">{inv.strategy}</td>
                <td className="py-3 pr-4 font-sans text-xs text-stone">{fmt(inv.budgetMin)} – {fmt(inv.budgetMax)}</td>
                <td className="py-3 pr-4">
                  <span className={`inline-block px-2 py-0.5 text-[0.55rem] uppercase tracking-widest border ${STATUS_COLORS[inv.status] || 'border-stone text-stone'}`}>
                    {inv.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="py-3 font-sans text-xs text-stone">
                  {new Date(inv.createdAt).toLocaleDateString('en-GB')}
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
