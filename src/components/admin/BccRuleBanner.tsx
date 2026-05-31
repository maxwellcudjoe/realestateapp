'use client'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'inbox.bccRuleDismissed'

export function BccRuleBanner() {
  // Start hidden to avoid SSR/CSR hydration flash. useEffect resolves the real state.
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    setHidden(localStorage.getItem(STORAGE_KEY) === 'true')
  }, [])

  if (hidden) return null

  return (
    <aside className="border-l-4 border-amber-400 bg-amber-50 p-4 text-sm space-y-2">
      <header className="flex items-center justify-between">
        <strong>One-time setup: BCC info@revebatir.co.uk on every reply</strong>
        <button
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, 'true')
            setHidden(true)
          }}
          className="text-amber-900 underline text-xs"
        >
          Dismiss
        </button>
      </header>
      <p>
        So every reply you send from your normal mailbox is captured in the platform thread,
        add this Outlook rule:
      </p>
      <ol className="list-decimal pl-5 space-y-1">
        <li>Outlook → Settings → Mail → Rules → Add new rule</li>
        <li>Name: <em>BCC info@ on dealer thread replies</em></li>
        <li>Condition: <em>The message is a reply</em> AND <em>I&apos;m on the To or Cc line</em></li>
        <li>Exception: <em>Subject contains</em> <code>unsubscribe</code> or <code>newsletter</code></li>
        <li>Action: <em>Bcc the message to</em> <code>info@revebatir.co.uk</code></li>
        <li>Save. Don&apos;t run on existing messages.</li>
      </ol>
    </aside>
  )
}
