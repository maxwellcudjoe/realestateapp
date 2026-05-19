export const SUBSCRIPTION_REQUEST_SUBJECT_PREFIX = '[Subscription request]'

export const SUBSCRIPTION_REQUEST_WINDOW_DAYS = 30

export interface RequestMessage {
  id: string
  applicationId: string
  senderUserId: string
  subject: string
  body: string
  createdAt: Date
}

export interface AdminReplyMessage {
  applicationId: string
  senderUserId: string
  createdAt: Date
}

/**
 * Given a list of subscription-request messages and a list of admin replies,
 * return the requests that are still "pending" — i.e., no admin sent a reply
 * on the same applicationId strictly after the request's createdAt.
 *
 * Only considers messages from the supplied list — caller is responsible for
 * scoping (last 30 days, subject prefix, etc.).
 */
export function pendingSubscriptionRequests(
  requests: RequestMessage[],
  adminReplies: AdminReplyMessage[],
): RequestMessage[] {
  const repliesByApp = new Map<string, Date[]>()
  for (const reply of adminReplies) {
    const arr = repliesByApp.get(reply.applicationId) ?? []
    arr.push(reply.createdAt)
    repliesByApp.set(reply.applicationId, arr)
  }
  return requests
    .filter((req) => {
      const replies = repliesByApp.get(req.applicationId) ?? []
      return !replies.some((replyAt) => replyAt > req.createdAt)
    })
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}

const TYPE_LABELS: Record<string, string> = {
  UPGRADE: 'Upgrade to Premium',
  CHANGE_MONTHLY: 'Change to Monthly',
  CHANGE_ANNUAL: 'Change to Annual',
  CANCEL: 'Cancel subscription',
}

/**
 * Parse the request type back out of the message body (first line of
 * `POST /api/portal/subscription/request` writes `Request type: <label>`).
 * Returns the label string or null if unparseable.
 */
export function parseRequestTypeFromBody(body: string): string | null {
  const m = body.match(/^Request type:\s*(.+)$/m)
  return m ? m[1].trim() : null
}

/**
 * Friendly elapsed-time string ("3 days ago", "just now").
 */
export function elapsedSince(date: Date, now: Date = new Date()): string {
  const ms = now.getTime() - date.getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

export { TYPE_LABELS as SUBSCRIPTION_REQUEST_TYPE_LABELS }
