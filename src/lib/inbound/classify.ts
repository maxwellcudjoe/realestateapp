import { isBlockedDomain, isBlockedLocalPart } from './blocklist'
import type { EmailClassification, ParsedEmail } from './types'

const NEWSLETTER_SUBJECT_RX = /\b(newsletter|digest|weekly update|marketing)\b/i

function splitAddress(email: string): { local: string; domain: string } {
  const [local, domain] = email.toLowerCase().split('@')
  return { local: local ?? '', domain: domain ?? '' }
}

function headerHas(headers: Record<string, string>, name: string): boolean {
  const lower = name.toLowerCase()
  return Object.keys(headers).some((k) => k.toLowerCase() === lower)
}

export function classify(email: ParsedEmail): EmailClassification {
  const { local, domain } = splitAddress(email.from.email)

  if (isBlockedDomain(domain)) return 'DROPPED_MARKETING'
  if (isBlockedLocalPart(local)) return 'DROPPED_AUTO'

  const hasListUnsub = headerHas(email.rawHeaders, 'List-Unsubscribe')
  if (hasListUnsub && !email.inReplyTo) return 'DROPPED_MARKETING'

  if (!email.inReplyTo && NEWSLETTER_SUBJECT_RX.test(email.subject)) return 'DROPPED_MARKETING'

  return 'KEPT'
}
