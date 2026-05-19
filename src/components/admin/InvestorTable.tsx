'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  filterInvestors,
  isKycExpiringSoon,
  DEFAULT_FILTERS,
  type InvestorFilters,
} from '@/lib/investor-filter'

export interface Investor {
  applicationId: string
  name: string
  email: string
  strategy: string
  budgetMin: number
  budgetMax: number
  buyerType: string
  status: string
  tier: string
  isPep: boolean
  entityType: string
  complianceCompleted: boolean
  kycExpiresAt: string | null
  deletedAt: string | null
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
  const [filters, setFilters] = useState<InvestorFilters>(DEFAULT_FILTERS)

  const set = <K extends keyof InvestorFilters>(key: K, value: InvestorFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }))

  const filtered = filterInvestors(investors, filters)

  const fmt = (n: number) => `£${n.toLocaleString('en-GB')}`

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={filters.status} onChange={(e) => set('status', e.target.value)} className={FIELD_CLASS}>
          <option value="ALL">All Statuses</option>
          {Object.keys(STATUS_COLORS).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select value={filters.tier} onChange={(e) => set('tier', e.target.value)} className={FIELD_CLASS}>
          <option value="ALL">All Tiers</option>
          <option value="FREE">Free</option>
          <option value="PREMIUM">Premium</option>
        </select>
        <select value={filters.pep} onChange={(e) => set('pep', e.target.value)} className={FIELD_CLASS}>
          <option value="ALL">All PEP</option>
          <option value="YES">PEP only</option>
          <option value="NO">Non-PEP</option>
        </select>
        <select value={filters.compliance} onChange={(e) => set('compliance', e.target.value)} className={FIELD_CLASS}>
          <option value="ALL">All Compliance</option>
          <option value="COMPLETE">Complete</option>
          <option value="INCOMPLETE">Incomplete</option>
        </select>
        <select value={filters.kycExpiring} onChange={(e) => set('kycExpiring', e.target.value)} className={FIELD_CLASS}>
          <option value="ALL">All KYC</option>
          <option value="YES">Expiring ≤ 30d</option>
        </select>
        <select value={filters.entityType} onChange={(e) => set('entityType', e.target.value)} className={FIELD_CLASS}>
          <option value="ALL">All Entities</option>
          <option value="INDIVIDUAL">Individual</option>
          <option value="LTD_COMPANY">Ltd Company</option>
          <option value="LLP">LLP</option>
          <option value="TRUST">Trust</option>
        </select>
        <label className="flex items-center gap-2 font-sans text-xs text-stone">
          <input
            type="checkbox"
            checked={filters.showDeleted}
            onChange={(e) => set('showDeleted', e.target.checked)}
            className="accent-gold"
          />
          Show deleted
        </label>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
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
            {filtered.map((inv) => {
              const expiring = isKycExpiringSoon(inv.kycExpiresAt)
              return (
                <tr key={inv.applicationId} className={`border-b border-carbon/50 hover:bg-charcoal/50 transition-colors cursor-pointer group ${inv.deletedAt ? 'opacity-50' : ''}`}>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <Link href={`/admin/investors/${inv.applicationId}`} className="font-sans text-sm text-ivory group-hover:text-gold transition-colors">
                      {inv.name}
                    </Link>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {inv.tier === 'PREMIUM' && (
                        <span className="font-sans text-[0.5rem] uppercase tracking-widest text-gold border border-gold/40 bg-gold/5 px-1.5 py-0.5">
                          Premium
                        </span>
                      )}
                      {inv.isPep && (
                        <span className="font-sans text-[0.5rem] uppercase tracking-widest text-gold border border-gold/60 bg-gold/10 px-1.5 py-0.5">
                          ⚠ PEP
                        </span>
                      )}
                      {expiring && (
                        <span className="font-sans text-[0.5rem] uppercase tracking-widest text-amber-400 border border-amber-400/40 px-1.5 py-0.5">
                          ⏳ KYC
                        </span>
                      )}
                      {!inv.complianceCompleted && (
                        <span className="font-sans text-[0.5rem] uppercase tracking-widest text-stone border border-carbon px-1.5 py-0.5">
                          Legacy
                        </span>
                      )}
                      {inv.deletedAt && (
                        <span className="font-sans text-[0.5rem] uppercase tracking-widest text-red-400 border border-red-400/40 px-1.5 py-0.5">
                          Deleted
                        </span>
                      )}
                    </div>
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
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center font-sans text-sm text-stone">
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
