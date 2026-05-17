'use client'

import { useRouter } from 'next/navigation'
import { MessageForm } from './MessageForm'
import { SectionLabel } from '@/components/ui/SectionLabel'

interface Message {
  id: string
  subject: string
  body: string
  createdAt: string
}

interface Props {
  initialMessages: Message[]
}

export function MessagesClient({ initialMessages }: Props) {
  const router = useRouter()

  function handleSent() {
    router.refresh()
  }

  return (
    <div className="space-y-16">
      <section>
        <SectionLabel>New Message</SectionLabel>
        <div className="mt-6">
          <MessageForm onSent={handleSent} />
        </div>
      </section>

      {initialMessages.length > 0 && (
        <section>
          <SectionLabel>Sent Messages</SectionLabel>
          <div className="mt-6 space-y-4">
            {initialMessages.map((msg) => (
              <div key={msg.id} className="border border-carbon p-6 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <p className="font-sans text-sm font-medium text-ivory">{msg.subject}</p>
                  <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone/60 flex-shrink-0">
                    {new Date(msg.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
                <p className="font-sans text-xs text-stone leading-relaxed whitespace-pre-wrap">{msg.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
