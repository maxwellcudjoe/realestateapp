import type { EmailDirection, ParsedEmail } from './types'

export interface DirectionResult {
  direction: EmailDirection
  attributedUserEmail: string | null
}

function parseInternal(spec: string): { domains: Set<string>; addresses: Set<string> } {
  const domains = new Set<string>()
  const addresses = new Set<string>()
  for (const raw of spec.split(',')) {
    const v = raw.trim().toLowerCase()
    if (!v) continue
    if (v.includes('@')) addresses.add(v)
    else domains.add(v)
  }
  return { domains, addresses }
}

export function detectDirection(email: ParsedEmail, internalDomainsEnv: string): DirectionResult {
  const { domains, addresses } = parseInternal(internalDomainsEnv)
  const lower = email.from.email.toLowerCase()
  const domain = lower.split('@')[1] ?? ''

  if (addresses.has(lower) || domains.has(domain)) {
    return { direction: 'OUTBOUND', attributedUserEmail: lower }
  }
  return { direction: 'INBOUND', attributedUserEmail: null }
}
