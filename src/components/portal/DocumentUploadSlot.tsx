'use client'

import { useState, useRef } from 'react'

interface Props {
  type: string
  label: string
  description: string
  existing?: { fileName: string; uploadedAt: string } | null
  onUploaded: (fileName: string) => void
}

export function DocumentUploadSlot({ type, label, description, existing, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState(existing?.fileName ?? '')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    const form = new FormData()
    form.append('file', file)
    form.append('type', type)

    try {
      const res = await fetch('/api/portal/documents', { method: 'POST', body: form })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Upload failed')
      } else {
        setFileName(json.fileName)
        onUploaded(json.fileName)
      }
    } catch {
      setError('Network error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="border border-carbon p-5">
      <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-1">{label}</p>
      <p className="font-sans text-xs text-stone mb-3">{description}</p>

      {fileName ? (
        <div className="flex items-center justify-between">
          <p className="font-sans text-sm text-ivory">{fileName}</p>
          <button
            onClick={() => inputRef.current?.click()}
            className="font-sans text-[0.6rem] uppercase tracking-widest text-stone hover:text-gold transition-colors"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-6 py-2.5 text-xs font-semibold uppercase tracking-widest border border-carbon text-stone hover:border-gold hover:text-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
        >
          {uploading ? 'Uploading…' : 'Choose File'}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFile}
        className="hidden"
      />

      {error && <p className="font-sans text-xs text-red-400 mt-2">{error}</p>}
    </div>
  )
}
