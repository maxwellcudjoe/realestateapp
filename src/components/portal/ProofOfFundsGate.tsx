'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  /** Existing PoF doc metadata if one exists but is stale. */
  staleDoc?: { fileName: string; uploadedAt: string } | null
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export function ProofOfFundsGate({ staleDoc }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only PDF, JPG, and PNG files are accepted')
      e.target.value = ''
      return
    }
    if (file.size > MAX_SIZE) {
      setError(`File must be under 10 MB (yours is ${(file.size / 1024 / 1024).toFixed(1)} MB)`)
      e.target.value = ''
      return
    }
    setUploading(true); setError('')
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/portal/proof-of-funds', { method: 'POST', body: form })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Upload failed')
      } else {
        router.refresh()
      }
    } catch {
      setError('Network error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="mb-12">
      <div className="border border-gold/60 bg-gold/5 p-5">
        <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-2">Proof of funds required</p>
        <p className="font-sans text-sm text-ivory leading-relaxed mb-1">
          Before requesting viewings or submitting offers, upload a recent <strong>bank statement</strong> or
          <strong> mortgage agreement-in-principle</strong> dated within the last 6 months.
        </p>
        {staleDoc && (
          <p className="font-sans text-xs text-stone mb-3">
            Last uploaded: <span className="italic">{staleDoc.fileName}</span> on {fmtDate(staleDoc.uploadedAt)} — now stale, please re-upload.
          </p>
        )}
        <div className="flex items-center gap-4 mt-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="font-sans text-xs uppercase tracking-widest text-obsidian bg-gold px-5 py-2.5 hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading…' : 'Upload proof of funds'}
          </button>
          <p className="font-sans text-[0.6rem] text-stone">PDF, JPG, or PNG · max 10 MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFile}
          className="hidden"
        />
        {error && <p className="font-sans text-xs text-red-400 mt-3">{error}</p>}
      </div>
    </section>
  )
}
