'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function ConvertLeadButton({ leadId, alreadyConverted, leadEmail }: { leadId: string; alreadyConverted: boolean; leadEmail: string | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [adminMessage, setAdminMessage] = useState('')
  const [pending, start] = useTransition()
  const [result, setResult] = useState<{ magicLinkUrl?: string; emailSent?: boolean; error?: string } | null>(null)

  if (alreadyConverted) return <span className="text-sm text-stone-500">Already converted ✓</span>
  if (!leadEmail) return <span className="text-sm text-rose-700">No email — add one to enable conversion.</span>

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
      <div className="border border-emerald-300 bg-emerald-50 p-3 rounded text-sm space-y-2">
        <p>✅ Magic-link {result.emailSent ? 'sent via email' : 'generated (email failed — copy below)'}.</p>
        <code className="block break-all text-xs">{result.magicLinkUrl}</code>
      </div>
    )
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="bg-emerald-700 text-white text-sm px-3 py-1 rounded">Convert to user</button>
  }

  return (
    <div className="border border-stone-300 p-3 rounded space-y-2 text-sm">
      <p>Send a magic-link to <strong>{leadEmail}</strong>. They&apos;ll set a password and finish onboarding.</p>
      <label className="block">
        <span className="text-xs text-stone-600">Optional personal message in the email</span>
        <textarea value={adminMessage} onChange={(e) => setAdminMessage(e.target.value)} rows={2} className="mt-1 w-full border border-stone-300 rounded px-2 py-1" />
      </label>
      {result?.error && <p className="text-rose-700 text-xs">{result.error}</p>}
      <div className="flex gap-2">
        <button onClick={go} disabled={pending} className="bg-emerald-700 text-white px-3 py-1 rounded disabled:opacity-50">{pending ? 'Sending…' : 'Send magic link'}</button>
        <button onClick={() => setOpen(false)} className="text-stone-600 px-3 py-1">Cancel</button>
      </div>
    </div>
  )
}
