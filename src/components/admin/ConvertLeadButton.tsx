'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function ConvertLeadButton({ leadId, alreadyConverted, leadEmail }: { leadId: string; alreadyConverted: boolean; leadEmail: string | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [adminMessage, setAdminMessage] = useState('')
  const [pending, start] = useTransition()
  const [result, setResult] = useState<{ magicLinkUrl?: string; emailSent?: boolean; error?: string } | null>(null)

  if (alreadyConverted) return <span className="text-sm text-stone">Already converted ✓</span>
  if (!leadEmail) return <span className="text-sm text-rose-300">No email — add one to enable conversion.</span>

  function go() {
    start(async () => {
      const res = await fetch(`/api/admin/leads/${leadId}/convert`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ adminMessage: adminMessage.trim() || null }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.ok) { setResult(j); router.refresh() }
      else setResult({ error: j.error ?? 'Convert failed' })
    })
  }

  if (result?.magicLinkUrl) {
    return (
      <div className="border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 p-3 rounded text-sm space-y-2">
        <p>✅ Magic-link {result.emailSent ? 'sent via email' : 'generated (email failed — copy below)'}.</p>
        <code className="block break-all text-xs text-emerald-100">{result.magicLinkUrl}</code>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-gold text-obsidian font-medium text-sm px-3 py-1.5 rounded hover:bg-gold-light transition-colors"
      >
        Convert to user
      </button>
    )
  }

  return (
    <div className="border border-white/10 bg-white/[0.02] p-3 rounded space-y-2 text-sm text-ivory">
      <p>Send a magic-link to <strong className="text-gold-light">{leadEmail}</strong>. They&apos;ll set a password and finish onboarding.</p>
      <label className="block">
        <span className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-1">Optional personal message in the email</span>
        <textarea
          value={adminMessage}
          onChange={(e) => setAdminMessage(e.target.value)}
          rows={2}
          className="mt-1 w-full bg-carbon border border-carbon rounded px-2 py-1 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors resize-none"
        />
      </label>
      {result?.error && <p className="text-rose-300 text-xs">{result.error}</p>}
      <div className="flex gap-2">
        <button
          onClick={go}
          disabled={pending}
          className="bg-gold text-obsidian font-medium px-3 py-1.5 rounded hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          {pending ? 'Sending…' : 'Send magic link'}
        </button>
        <button onClick={() => setOpen(false)} className="text-stone hover:text-ivory px-3 py-1.5 transition-colors">Cancel</button>
      </div>
    </div>
  )
}
