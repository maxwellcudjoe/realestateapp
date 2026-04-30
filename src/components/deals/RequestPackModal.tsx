'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface Props {
  dealTitle: string
  onClose: () => void
}

export function RequestPackModal({ dealTitle, onClose }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          message: `Please send me the full deal pack for: ${dealTitle}`,
          dealTitle,
        }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMsg('Failed to send — please try again.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/90"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-charcoal border border-carbon w-full max-w-md p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif text-2xl font-light text-ivory">Request Full Pack</h3>
          <button
            onClick={onClose}
            className="text-stone hover:text-ivory font-sans text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="font-sans text-xs text-stone mb-6 leading-relaxed">
          Deal: <span className="text-gold">{dealTitle}</span>
        </p>

        {status === 'success' ? (
          <p className="font-sans text-sm text-gold">
            Request sent. We'll be in touch within 24 hours.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-obsidian border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors"
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-obsidian border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors"
                placeholder="john@example.com"
              />
            </div>
            {status === 'error' && (
              <p className="font-sans text-xs text-red-400">{errorMsg}</p>
            )}
            <Button
              type="submit"
              fullWidth
              disabled={status === 'loading'}
              className="mt-2"
            >
              {status === 'loading' ? 'Sending…' : 'Send Request'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
