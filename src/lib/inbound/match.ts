import type { MatchConfidence, ParsedEmail } from './types'

const UK_POSTCODE_RX = /\b([A-Z]{1,2}\d[A-Z\d]?) ?(\d[A-Z]{2})\b/i

export interface DealLookups {
  findThreadByMessageId(messageId: string): Promise<{ id: string; dealId: string | null } | null>
  findDealByPostcode(postcode: string): Promise<Array<{ id: string; address: string }>>
  findDealByAddress(addressFragment: string): Promise<{ id: string } | null>
  findDealsByDealerEmail(email: string): Promise<Array<{ id: string }>>
}

export interface MatchResult {
  dealId: string | null
  confidence: MatchConfidence
}

function extractPostcode(text: string): string | null {
  const m = text.match(UK_POSTCODE_RX)
  if (!m) return null
  return `${m[1].toUpperCase()} ${m[2].toUpperCase()}`
}

export async function matchToDeal(email: ParsedEmail, lookups: DealLookups): Promise<MatchResult> {
  if (email.inReplyTo) {
    const thread = await lookups.findThreadByMessageId(email.inReplyTo)
    if (thread?.dealId) return { dealId: thread.dealId, confidence: 'HIGH' }
  }

  const postcode = extractPostcode(email.subject)
  if (postcode) {
    const matches = await lookups.findDealByPostcode(postcode)
    if (matches.length === 1) return { dealId: matches[0].id, confidence: 'HIGH' }
    if (matches.length > 1) return { dealId: null, confidence: 'NONE' }
  }

  const dealerDeals = await lookups.findDealsByDealerEmail(email.from.email.toLowerCase())
  if (dealerDeals.length === 1) return { dealId: dealerDeals[0].id, confidence: 'MEDIUM' }

  return { dealId: null, confidence: 'NONE' }
}
