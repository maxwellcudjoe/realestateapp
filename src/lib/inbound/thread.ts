const PREFIX_RX = /^(?:\s*(?:re|fw|fwd)\s*:\s*|\s*\*?external\*?\s*:?\s*)+/i

export function normaliseSubject(subject: string): string {
  let s = (subject ?? '').trim()
  let prev: string
  do {
    prev = s
    s = s.replace(PREFIX_RX, '').trim()
  } while (s !== prev)
  return s
}

export interface ThreadLookups {
  findThreadByMessageId(messageId: string): Promise<{ id: string; dealId: string | null } | null>
}

export interface ThreadInput {
  messageId: string
  inReplyTo: string | null
  references: string[]
  subject: string
}

export interface ThreadResult {
  threadId: string
  isNew: boolean
  normalisedSubject: string
}

export async function resolveThread(
  input: ThreadInput,
  lookups: ThreadLookups,
): Promise<ThreadResult> {
  const normalisedSubject = normaliseSubject(input.subject)

  if (input.inReplyTo) {
    const t = await lookups.findThreadByMessageId(input.inReplyTo)
    if (t) return { threadId: t.id, isNew: false, normalisedSubject }
  }

  for (const ref of input.references.slice().reverse()) {
    const t = await lookups.findThreadByMessageId(ref)
    if (t) return { threadId: t.id, isNew: false, normalisedSubject }
  }

  return { threadId: '', isNew: true, normalisedSubject }
}
