'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DocumentUploadSlot } from '@/components/portal/DocumentUploadSlot'

const SLOTS = [
  { type: 'PASSPORT', label: 'Proof of Identity', description: 'Passport or driving licence (PDF, JPG, or PNG, max 10 MB)' },
  { type: 'PROOF_OF_ADDRESS', label: 'Proof of Address', description: 'Utility bill or bank statement dated within 3 months' },
  { type: 'SOURCE_OF_FUNDS', label: 'Source of Funds', description: 'Bank statement, payslip, or solicitor letter' },
]

export default function DocumentsPage() {
  const router = useRouter()
  const [status, setStatus] = useState<string | null>(null)
  const [uploaded, setUploaded] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portal/status')
      .then((r) => r.json())
      .then((data) => {
        setStatus(data.status)
        if (data.status !== 'DOCUMENTS_REQUESTED') {
          router.push('/portal/status')
        }
        if (data.documents) {
          const map: Record<string, string> = {}
          for (const doc of data.documents) map[doc.type] = doc.fileName
          setUploaded(map)
        }
        setLoading(false)
      })
      .catch(() => router.push('/portal/status'))
  }, [router])

  function handleUploaded(type: string, fileName: string) {
    setUploaded((prev) => ({ ...prev, [type]: fileName }))
  }

  const allUploaded = SLOTS.every((s) => uploaded[s.type])

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/portal/documents/submit', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Submission failed')
        setSubmitting(false)
      } else {
        router.push('/portal/status')
      }
    } catch {
      setError('Network error')
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="font-sans text-sm text-stone">Loading…</p>
  }

  if (status !== 'DOCUMENTS_REQUESTED') return null

  return (
    <div>
      <h1 className="font-serif text-4xl font-light text-ivory mb-2">Upload Documents</h1>
      <p className="font-sans text-sm text-stone mb-8">
        Please upload the following documents to complete your KYC verification.
      </p>

      <div className="space-y-4 mb-8">
        {SLOTS.map((slot) => (
          <DocumentUploadSlot
            key={slot.type}
            type={slot.type}
            label={slot.label}
            description={slot.description}
            existing={uploaded[slot.type] ? { fileName: uploaded[slot.type], uploadedAt: '' } : null}
            onUploaded={(fn) => handleUploaded(slot.type, fn)}
          />
        ))}
      </div>

      {error && <p className="font-sans text-xs text-red-400 mb-4">{error}</p>}

      {allUploaded && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full px-8 py-4 text-xs font-semibold uppercase tracking-widest border border-gold text-gold hover:bg-gold hover:text-obsidian transition-colors disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit All Documents'}
        </button>
      )}
    </div>
  )
}
