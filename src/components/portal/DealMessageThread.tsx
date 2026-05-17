'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'

const FIELD = 'w-full bg-charcoal border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'

interface ThreadMessage {
  id: string
  subject: string
  body: string
  createdAt: string
  senderRole: string
  isMine: boolean
}

export function DealMessageThread({ dealId }: { dealId: string }) {
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/deals/${dealId}/messages`)
      const json = await res.json()
      if (res.ok) setMessages(json.messages ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [dealId])

  useEffect(() => { load() }, [load])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setSending(true); setError('')
    try {
      const res = await fetch(`/api/portal/deals/${dealId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error ?? 'Send failed')
      } else {
        setSubject(''); setBody('')
        await load()
      }
    } catch {
      setError('Network error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <p className="font-sans text-xs text-stone">Loading…</p>
      ) : messages.length === 0 ? (
        <p className="font-sans text-xs text-stone">No messages yet on this deal.</p>
      ) : (
        <div className="space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`border-l-2 pl-4 py-2 ${m.senderRole === 'admin' ? 'border-gold bg-gold/5' : 'border-carbon'}`}>
              <div className="flex items-center justify-between mb-1 gap-3">
                <p className="font-sans text-xs font-medium text-ivory">{m.subject}</p>
                <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone whitespace-nowrap">
                  {m.senderRole === 'admin' ? 'Admin' : 'You'} ·{' '}
                  {new Date(m.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <p className="font-sans text-sm text-stone whitespace-pre-wrap leading-relaxed">{m.body}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={send} className="space-y-4 border-t border-carbon pt-6">
        <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold">Send a message about this deal</p>
        <div>
          <label className={LABEL}>Subject</label>
          <input type="text" required maxLength={255} value={subject} onChange={(e) => setSubject(e.target.value)} className={FIELD} placeholder="e.g. Question about rental potential" />
        </div>
        <div>
          <label className={LABEL}>Message</label>
          <textarea required rows={4} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} className={FIELD} placeholder="Type your message…" />
        </div>
        {error && <p className="font-sans text-xs text-red-400">{error}</p>}
        <Button type="submit" disabled={sending || !subject.trim() || !body.trim()}>
          {sending ? 'Sending…' : 'Send'}
        </Button>
      </form>
    </div>
  )
}
