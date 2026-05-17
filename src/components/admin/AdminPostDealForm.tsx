'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { PROPERTY_TYPES, TENURE_OPTIONS, EPC_RATINGS } from '@/lib/property'

interface Props {
  applicationId: string
}

const FIELD = 'w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

export function AdminPostDealForm({ applicationId }: Props) {
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [askingPrice, setAskingPrice] = useState('')
  const [summary, setSummary] = useState('')
  // Task 4.3 structured fields
  const [bedrooms, setBedrooms] = useState<string>('')
  const [bathrooms, setBathrooms] = useState<string>('')
  const [propertyType, setPropertyType] = useState<string>('')
  const [tenure, setTenure] = useState<string>('')
  const [epcRating, setEpcRating] = useState<string>('')
  const [rentalAppraisalMonthly, setRentalAppraisalMonthly] = useState<string>('')
  const [floorAreaSqft, setFloorAreaSqft] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  function num(s: string): number | undefined {
    const n = parseFloat(s.replace(/,/g, ''))
    return isNaN(n) ? undefined : n
  }
  function int(s: string): number | undefined {
    const n = parseInt(s.replace(/,/g, ''), 10)
    return isNaN(n) ? undefined : n
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const price = parseFloat(askingPrice.replace(/,/g, ''))
    if (isNaN(price) || price <= 0) {
      setError('Asking price must be a positive number')
      return
    }
    setSubmitting(true)
    setError('')
    setSuccess(false)
    try {
      const res = await fetch(`/api/admin/investors/${applicationId}/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          address: address.trim(),
          askingPrice: price,
          summary: summary.trim() || undefined,
          bedrooms: int(bedrooms),
          bathrooms: int(bathrooms),
          propertyType: propertyType || undefined,
          tenure: tenure || undefined,
          epcRating: epcRating || undefined,
          rentalAppraisalMonthly: num(rentalAppraisalMonthly),
          floorAreaSqft: int(floorAreaSqft),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setTitle('')
      setAddress('')
      setAskingPrice('')
      setSummary('')
      setBedrooms(''); setBathrooms(''); setPropertyType(''); setTenure(''); setEpcRating(''); setRentalAppraisalMonthly(''); setFloorAreaSqft('')
      setSuccess(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={255}
          placeholder="e.g. 2-bed terraced, Birmingham"
          className="w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors"
        />
      </div>
      <div>
        <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">Address</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          maxLength={255}
          placeholder="14 Maple Street, Birmingham, B1 1AA"
          className="w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors"
        />
      </div>
      <div>
        <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">Asking Price (£)</label>
        <input
          type="text"
          value={askingPrice}
          onChange={(e) => setAskingPrice(e.target.value)}
          required
          placeholder="185000"
          className="w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors"
        />
      </div>
      <div className="border-t border-carbon pt-4 space-y-4">
        <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone/70">Property details (optional)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={LABEL}>Beds</label>
            <input type="number" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className={FIELD} placeholder="3" />
          </div>
          <div>
            <label className={LABEL}>Baths</label>
            <input type="number" min={0} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className={FIELD} placeholder="1" />
          </div>
          <div>
            <label className={LABEL}>Sqft</label>
            <input type="number" min={0} value={floorAreaSqft} onChange={(e) => setFloorAreaSqft(e.target.value)} className={FIELD} placeholder="850" />
          </div>
          <div>
            <label className={LABEL}>EPC</label>
            <select value={epcRating} onChange={(e) => setEpcRating(e.target.value)} className={FIELD}>
              <option value="">—</option>
              {EPC_RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={LABEL}>Type</label>
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={FIELD}>
              <option value="">—</option>
              {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Tenure</label>
            <select value={tenure} onChange={(e) => setTenure(e.target.value)} className={FIELD}>
              <option value="">—</option>
              {TENURE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Rent £/mo</label>
            <input type="number" min={0} value={rentalAppraisalMonthly} onChange={(e) => setRentalAppraisalMonthly(e.target.value)} className={FIELD} placeholder="1100" />
          </div>
        </div>
      </div>

      <div>
        <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">Summary (optional)</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={4}
          placeholder="Two-bed mid-terrace, 7.2% gross yield, vacant possession, no chain."
          className="w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors resize-none"
        />
      </div>
      {error && <p className="font-sans text-xs text-red-400">{error}</p>}
      {success && <p className="font-sans text-xs text-gold">Deal posted — investor notified by email.</p>}
      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? 'Posting…' : 'Post Deal'}
      </Button>
    </form>
  )
}
