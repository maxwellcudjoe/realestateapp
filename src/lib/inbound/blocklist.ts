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
  const d = domain.toLowerCase()
  if (BLOCKED_DOMAINS.includes(d as (typeof BLOCKED_DOMAINS)[number])) return true
  for (const suffix of BLOCKED_DOMAIN_SUFFIXES) if (d.endsWith(suffix)) return true
  return false
}

export function isBlockedLocalPart(local: string): boolean {
  return BLOCKED_LOCAL_PART_RX.test(local)
}
