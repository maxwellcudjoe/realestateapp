export const BLOCKED_DOMAINS = [
  'facebook.com',
  'facebookmail.com',
  'linkedin.com',
  'mailchimp.com',
  'mailchi.mp',
  'twitter.com',
  'x.com',
  'instagram.com',
  'mail.notion.so',
  'github.com',
  'slack.com',
  'medium.com',
  'substack.com',
] as const

const BLOCKED_DOMAIN_SUFFIXES = ['.atlassian.net'] as const

const BLOCKED_LOCAL_PART_RX =
  /^(noreply|no-reply|donotreply|notifications|updates|newsletter|digest|alerts)$/i

export function isBlockedDomain(domain: string): boolean {
  let d = domain.toLowerCase()
  if (d.endsWith('.')) d = d.slice(0, -1)
  if (!d) return false
  for (const apex of BLOCKED_DOMAINS as readonly string[]) {
    if (d === apex || d.endsWith('.' + apex)) return true
  }
  for (const suffix of BLOCKED_DOMAIN_SUFFIXES) if (d.endsWith(suffix)) return true
  return false
}

export function isBlockedLocalPart(local: string): boolean {
  return BLOCKED_LOCAL_PART_RX.test(local.trim())
}
