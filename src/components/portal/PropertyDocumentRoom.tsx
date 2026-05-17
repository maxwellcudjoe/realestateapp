'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { PROPERTY_DOCUMENT_TYPES, propertyDocTypeLabel } from '@/lib/property-docs'

const FIELD = 'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

interface Doc {
  id: string
  type: string
  fileName: string
  expiresAt: string | null
  uploadedAt: string
}

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const MAX_SIZE = 20 * 1024 * 1024

export function PropertyDocumentRoom({ propertyId }: { propertyId: string }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('TITLE_DEED')
  const [expiresAt, setExpiresAt] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/properties/${propertyId}/documents`)
      const json = await res.json()
      if (res.ok) setDocs(json.documents ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [propertyId])

  useEffect(() => { load() }, [load])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    if (!ALLOWED_MIME.includes(file.type)) { setError('Allowed: PDF, JPG, PNG, DOC, DOCX'); e.target.value = ''; return }
    if (file.size > MAX_SIZE) { setError(`Max 20MB`); e.target.value = ''; return }

    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('type', type)
    if (expiresAt) form.append('expiresAt', expiresAt)
    try {
      const res = await fetch(`/api/portal/properties/${propertyId}/documents`, { method: 'POST', body: form })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setError(json.error ?? 'Upload failed')
      else {
        setExpiresAt('')
        await load()
      }
    } catch {
      setError('Network error')
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  async function openDoc(docId: string) {
    try {
      const res = await fetch(`/api/portal/properties/${propertyId}/documents/${docId}/url`)
      const json = await res.json()
      if (res.ok && json.url) window.open(json.url, '_blank', 'noopener')
      else setError(json.error ?? 'Could not open document')
    } catch { setError('Network error') }
  }

  async function deleteDoc(docId: string) {
    if (!confirm('Delete this document?')) return
    try {
      const res = await fetch(`/api/portal/properties/${propertyId}/documents/${docId}/url`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? 'Delete failed')
      } else await load()
    } catch { setError('Network error') }
  }

  const now = Date.now()
  const SOON_MS = 30 * 24 * 60 * 60 * 1000  // 30 days

  return (
    <div className="space-y-6">
      {loading ? (
        <p className="font-sans text-xs text-stone">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="font-sans text-xs text-stone">No documents yet.</p>
      ) : (
        <ul className="divide-y divide-carbon/60">
          {docs.map((d) => {
            const expSoon = d.expiresAt && new Date(d.expiresAt).getTime() - now < SOON_MS
            const expired = d.expiresAt && new Date(d.expiresAt).getTime() < now
            return (
              <li key={d.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-sans text-[0.55rem] uppercase tracking-widest text-gold">{propertyDocTypeLabel(d.type)}</p>
                  <p className="font-sans text-sm text-ivory truncate">{d.fileName}</p>
                  <p className="font-sans text-[0.6rem] text-stone">
                    Uploaded {new Date(d.uploadedAt).toLocaleDateString('en-GB')}
                    {d.expiresAt && (
                      <span className={`ml-2 ${expired ? 'text-red-400' : expSoon ? 'text-amber-400' : 'text-stone'}`}>
                        · {expired ? 'Expired' : 'Expires'} {new Date(d.expiresAt).toLocaleDateString('en-GB')}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => openDoc(d.id)} className="font-sans text-[0.6rem] uppercase tracking-widest text-gold hover:text-ivory">View</button>
                  <button onClick={() => deleteDoc(d.id)} className="font-sans text-[0.6rem] uppercase tracking-widest text-stone hover:text-red-400">Delete</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="border-t border-carbon pt-6 space-y-4">
        <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">Upload Document</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={FIELD}>
              {PROPERTY_DOCUMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Expiry (optional)</label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={FIELD} />
          </div>
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleUpload} className="hidden" />
        {error && <p className="font-sans text-xs text-red-400">{error}</p>}
        <Button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading…' : 'Choose file & upload'}
        </Button>
        <p className="font-sans text-[0.6rem] text-stone">PDF, JPG, PNG, DOC, DOCX up to 20MB. Set expiry for time-sensitive certs (gas safety, EICR).</p>
      </div>
    </div>
  )
}
