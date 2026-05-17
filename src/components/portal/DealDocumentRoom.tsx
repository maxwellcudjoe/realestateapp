'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { DEAL_DOCUMENT_TYPES, dealDocTypeLabel } from '@/lib/deal-documents'

const FIELD = 'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const MAX_SIZE = 20 * 1024 * 1024

interface Doc {
  id: string
  type: string
  fileName: string
  visibility: string
  uploadedAt: string
  uploadedByMe: boolean
}

interface Props {
  dealId: string
  isAdmin: boolean
}

export function DealDocumentRoom({ dealId, isAdmin }: Props) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('MEMO_OF_SALE')
  const [visibility, setVisibility] = useState<'INVESTOR' | 'ADMIN_ONLY'>('INVESTOR')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/deals/${dealId}/documents`)
      const json = await res.json()
      if (res.ok) setDocs(json.documents ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [dealId])

  useEffect(() => { load() }, [load])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    if (!ALLOWED_MIME.includes(file.type)) { setError('Allowed: PDF, JPG, PNG, DOC, DOCX'); e.target.value = ''; return }
    if (file.size > MAX_SIZE) { setError(`Max 20MB (yours: ${(file.size / 1024 / 1024).toFixed(1)}MB)`); e.target.value = ''; return }

    setUploading(true)
    const form = new FormData()
    form.append('file', file); form.append('type', type)
    if (isAdmin) form.append('visibility', visibility)
    try {
      const res = await fetch(`/api/portal/deals/${dealId}/documents`, { method: 'POST', body: form })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setError(json.error ?? 'Upload failed')
      else await load()
    } catch {
      setError('Network error')
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  async function openDoc(docId: string) {
    try {
      const res = await fetch(`/api/portal/deals/${dealId}/documents/${docId}/url`)
      const json = await res.json()
      if (res.ok && json.url) window.open(json.url, '_blank', 'noopener')
      else setError(json.error ?? 'Could not open document')
    } catch {
      setError('Network error')
    }
  }

  async function deleteDoc(docId: string) {
    if (!confirm('Delete this document? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/portal/deals/${dealId}/documents/${docId}/url`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setError(json.error ?? 'Delete failed')
      else await load()
    } catch {
      setError('Network error')
    }
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <p className="font-sans text-xs text-stone">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="font-sans text-xs text-stone">No documents yet on this deal.</p>
      ) : (
        <ul className="divide-y divide-carbon/60">
          {docs.map((d) => (
            <li key={d.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-sans text-[0.55rem] uppercase tracking-widest text-gold">{dealDocTypeLabel(d.type)}</p>
                  {d.visibility === 'ADMIN_ONLY' && (
                    <span className="font-sans text-[0.55rem] uppercase tracking-widest text-stone border border-carbon px-1.5">Admin only</span>
                  )}
                </div>
                <p className="font-sans text-sm text-ivory truncate">{d.fileName}</p>
                <p className="font-sans text-[0.6rem] text-stone">
                  {new Date(d.uploadedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <button onClick={() => openDoc(d.id)} className="font-sans text-[0.6rem] uppercase tracking-widest text-gold hover:text-ivory transition-colors">View</button>
                {(isAdmin || d.uploadedByMe) && (
                  <button onClick={() => deleteDoc(d.id)} className="font-sans text-[0.6rem] uppercase tracking-widest text-stone hover:text-red-400 transition-colors">Delete</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-carbon pt-6 space-y-4">
        <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">Upload Document</p>
        <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-2' : ''} gap-4`}>
          <div>
            <label className={LABEL}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={FIELD}>
              {DEAL_DOCUMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {isAdmin && (
            <div>
              <label className={LABEL}>Visibility</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as 'INVESTOR' | 'ADMIN_ONLY')} className={FIELD}>
                <option value="INVESTOR">Visible to investor</option>
                <option value="ADMIN_ONLY">Admin only (internal)</option>
              </select>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleUpload} className="hidden" />
        {error && <p className="font-sans text-xs text-red-400">{error}</p>}
        <Button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading…' : 'Choose file & upload'}
        </Button>
        <p className="font-sans text-[0.6rem] text-stone">PDF, JPG, PNG, DOC, DOCX up to 20MB</p>
      </div>
    </div>
  )
}
