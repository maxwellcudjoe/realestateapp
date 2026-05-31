'use client'
import { useState } from 'react'

interface Attachment {
  filename: string
  size: number
  path: string
}

interface Email {
  id: string
  direction: 'INBOUND' | 'OUTBOUND'
  fromEmail: string
  fromName: string | null
  receivedAt: string
  bodyText: string
  attachments: Attachment[]
}

interface Props {
  thread: { id: string; subject: string; emails: Email[] }
}

export function EmailThread({ thread }: Props) {
  const [open, setOpen] = useState(false)
  const latest = thread.emails[thread.emails.length - 1]

  return (
    <div className="border border-stone-200 rounded">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'collapse thread' : 'expand thread'}
        className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-stone-50"
      >
        <div>
          <h3 className="font-medium">{thread.subject}</h3>
          <p className="text-sm text-stone-500">
            {thread.emails.length} message{thread.emails.length === 1 ? '' : 's'} ·
            last from {latest.fromName ?? latest.fromEmail} ·
            {' '}{new Date(latest.receivedAt).toLocaleString('en-GB')}
          </p>
        </div>
        <span className="text-stone-400">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <ol className="divide-y divide-stone-100 border-t border-stone-200">
          {thread.emails.map((e) => (
            <li key={e.id} className="px-4 py-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="font-medium">{e.fromName ?? e.fromEmail}</span>
                  {e.fromName && <span className="text-stone-500 ml-2 text-xs">{e.fromEmail}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={
                    'text-xs px-2 py-0.5 rounded ' +
                    (e.direction === 'INBOUND'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-sky-100 text-sky-800')
                  }>
                    {e.direction === 'INBOUND' ? 'Inbound' : 'Outbound'}
                  </span>
                  <time className="text-xs text-stone-500">{new Date(e.receivedAt).toLocaleString('en-GB')}</time>
                </div>
              </div>
              <pre className="whitespace-pre-wrap text-stone-700 font-sans">{e.bodyText}</pre>
              {e.attachments.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {e.attachments.map((a) => (
                    <li key={a.path}>
                      <a
                        href={`/api/admin/inbox/attachment?path=${encodeURIComponent(a.path)}`}
                        className="text-emerald-700 hover:underline text-xs"
                      >
                        📎 {a.filename} ({Math.round(a.size / 1024)} KB)
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
