'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface Props {
  onSent: () => void
}

export function MessageForm({ onSent }: Props) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) return
    setStatus('sending')
    setErrorMsg('')

    try {
      const res = await fetch('/api/portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to send')
      }
      setStatus('sent')
      setSubject('')
      setBody('')
      onSent()
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  if (status === 'sent') {
    return (
      <div className="p-6 border border-gold/30 bg-gold/5">
        <p className="font-sans text-sm text-ivory">Your message has been sent. We will respond within 24 hours.</p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-4 font-sans text-xs uppercase tracking-widest text-gold hover:text-ivory transition-colors"
        >
          Send another message
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={255}
          required
          placeholder="e.g. Question about my application"
          className="w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors"
        />
      </div>

      <div>
        <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">
          Message
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={6}
          placeholder="Write your message here..."
          className="w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors resize-none"
        />
      </div>

      {status === 'error' && (
        <p className="font-sans text-xs text-red-400">{errorMsg}</p>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={status === 'sending' || !subject.trim() || !body.trim()}
      >
        {status === 'sending' ? 'Sending…' : 'Send Message'}
      </Button>
    </form>
  )
}
