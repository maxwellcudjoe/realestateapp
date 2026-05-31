'use client'
import { useState, useTransition } from 'react'

interface Props {
  email: {
    id: string
    subject: string
    fromEmail: string
    receivedAt: string
    bodyTextSnippet: string
  }
}

export function UnmatchedEmailRow({ email }: Props) {
  const [dealId, setDealId] = useState('')
  const [pending, start] = useTransition()
  const [done, setDone] = useState<'assigned' | 'dropped' | null>(null)
  const [error, setError] = useState<string | null>(null)

  function assign() {
    if (!dealId) return
    setError(null)
    start(async () => {
      const res = await fetch('/api/admin/inbox/assign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ emailId: email.id, dealId }),
      })
      if (res.ok) setDone('assigned')
      else setError('Assign failed')
    })
  }

  function drop() {
    setError(null)
    start(async () => {
      const res = await fetch('/api/admin/inbox/drop', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ emailId: email.id }),
      })
      if (res.ok) setDone('dropped')
      else setError('Drop failed')
    })
  }

  if (done) {
    return (
      <tr>
        <td colSpan={4} className="px-3 py-2 text-sm text-stone-500">
          {done === 'assigned' ? 'Assigned to deal.' : 'Dropped.'}
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-stone-200">
      <td className="px-3 py-2 text-sm">{new Date(email.receivedAt).toLocaleString('en-GB')}</td>
      <td className="px-3 py-2 text-sm">{email.fromEmail}</td>
      <td className="px-3 py-2 text-sm">
        <div className="font-medium">{email.subject}</div>
        <div className="text-stone-500 text-xs line-clamp-1">{email.bodyTextSnippet}</div>
      </td>
      <td className="px-3 py-2 text-sm space-x-2 whitespace-nowrap">
        <input
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
          placeholder="Deal ID"
          className="border border-stone-300 rounded px-2 py-1 text-xs w-32"
        />
        <button
          onClick={assign}
          disabled={pending || !dealId}
          className="text-emerald-700 hover:underline disabled:opacity-50"
        >
          Assign
        </button>
        <button
          onClick={drop}
          disabled={pending}
          className="text-rose-700 hover:underline disabled:opacity-50"
        >
          Drop
        </button>
        {error && <span className="text-rose-700 text-xs">{error}</span>}
      </td>
    </tr>
  )
}
