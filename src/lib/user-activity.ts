export type ActivityKind = 'LOGIN' | 'AUDIT' | 'MESSAGE' | 'VIEWING' | 'FAVOURITE'

export interface ActivityEvent {
  id: string
  kind: ActivityKind
  when: Date
  title: string
  detail: string | null
  href: string | null
}

export interface LoginAttemptRow {
  id: string
  email: string
  ipAddress: string
  success: boolean
  reason: string | null
  createdAt: Date
}

export interface AuditRow {
  id: string
  action: string
  actorUserId: string | null
  resourceType: string
  resourceId: string | null
  createdAt: Date
}

export interface MessageRow {
  id: string
  subject: string
  applicationId: string
  dealId: string | null
  createdAt: Date
}

export interface ViewingRow {
  id: string
  status: string
  dealId: string
  requestedSlot: Date
  createdAt: Date
}

export interface FavouriteRow {
  id: string
  source: 'DEAL' | 'CONTENTFUL'
  label: string
  href: string | null
  createdAt: Date
}

export function mapLoginAttempt(row: LoginAttemptRow): ActivityEvent {
  return {
    id: `login:${row.id}`,
    kind: 'LOGIN',
    when: row.createdAt,
    title: row.success
      ? `Successful login`
      : `Failed login — ${row.reason ?? 'unknown'}`,
    detail: `from ${row.ipAddress}`,
    href: null,
  }
}

export function mapAudit(row: AuditRow, labelFor: (action: string) => string): ActivityEvent {
  const acted = row.actorUserId ? 'You performed' : 'System recorded'
  return {
    id: `audit:${row.id}`,
    kind: 'AUDIT',
    when: row.createdAt,
    title: labelFor(row.action),
    detail: `${acted} · ${row.resourceType}${row.resourceId ? ` · ${row.resourceId.slice(0, 8)}` : ''}`,
    href: null,
  }
}

export function mapMessage(row: MessageRow, applicationHref: string): ActivityEvent {
  return {
    id: `msg:${row.id}`,
    kind: 'MESSAGE',
    when: row.createdAt,
    title: row.subject || '(no subject)',
    detail: row.dealId ? `Deal message` : `Portal message`,
    href: applicationHref,
  }
}

export function mapViewing(row: ViewingRow): ActivityEvent {
  return {
    id: `view:${row.id}`,
    kind: 'VIEWING',
    when: row.createdAt,
    title: `Viewing ${row.status.toLowerCase()}`,
    detail: `Requested for ${row.requestedSlot.toLocaleString('en-GB')}`,
    href: null,
  }
}

export function mapFavourite(row: FavouriteRow): ActivityEvent {
  return {
    id: `fav:${row.source}:${row.id}`,
    kind: 'FAVOURITE',
    when: row.createdAt,
    title: `Favourited ${row.source === 'CONTENTFUL' ? 'public deal' : 'deal'}`,
    detail: row.label,
    href: row.href,
  }
}

/**
 * Sort the supplied event arrays into one chronological (descending) feed.
 * Optionally filter by allowed kinds.
 */
export function mergeActivity(
  events: ActivityEvent[],
  allowedKinds?: Set<ActivityKind>,
): ActivityEvent[] {
  const out = allowedKinds
    ? events.filter((e) => allowedKinds.has(e.kind))
    : events.slice()
  out.sort((a, b) => b.when.getTime() - a.when.getTime())
  return out
}

export const ACTIVITY_KIND_LABEL: Record<ActivityKind, string> = {
  LOGIN: 'Login',
  AUDIT: 'Audit',
  MESSAGE: 'Message',
  VIEWING: 'Viewing',
  FAVOURITE: 'Favourite',
}
