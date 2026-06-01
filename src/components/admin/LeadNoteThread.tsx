'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Note { id: string; body: string; createdAt: string; authorUserId: string }

export function LeadNoteThread({ leadId, notes }: { leadId: string; notes: Note[] }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function add(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setError(null)
    start(async () => {
      const res = await fetch(`/api/admin/leads/${leadId}/notes`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: text.trim() }),
      })
      if (res.ok) { setText(''); router.refresh() }
      else { const j = await res.json().catch(() => ({})); setError(j.error ?? 'Add note failed') }
    })
  }

  return (
    <div className="space-y-3">
      <form onSubmit={add} className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full bg-carbon border border-carbon rounded px-3 py-2 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors resize-none"
          placeholder="Add a note about this conversation…"
        />
        {error && <p className="text-rose-300 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="bg-gold text-obsidian font-medium text-sm px-3 py-1.5 rounded hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {pending ? 'Adding…' : 'Add note'}
        </button>
      </form>
      <ul className="divide-y divide-white/10 border border-white/10 rounded bg-white/[0.02]">
        {notes.length === 0 && <li className="px-3 py-2 text-sm text-stone">No notes yet.</li>}
        {notes.map((n) => (
          <li key={n.id} className="px-3 py-2 text-sm text-ivory">
            <div className="text-xs text-stone">{new Date(n.createdAt).toLocaleString('en-GB')}</div>
            <pre className="whitespace-pre-wrap font-sans">{n.body}</pre>
          </li>
        ))}
      </ul>
    </div>
  )
}
