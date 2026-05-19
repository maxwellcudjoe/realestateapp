import { prisma } from '@/lib/prisma'

/**
 * Canonical action codes — keep stable, additive. Used to filter the admin
 * audit log and to derive the human label.
 */
export const AUDIT_ACTIONS = {
  DEAL_STAGE_CHANGED: 'Deal stage changed',
  OFFER_DECIDED: 'Offer decision recorded',
  OFFER_SUBMITTED: 'Investor submitted offer',
  OFFER_UPDATED: 'Investor updated offer',
  OFFER_WITHDRAWN: 'Investor withdrew offer',
  DEAL_DOC_UPLOADED: 'Deal document uploaded',
  DEAL_DOC_VIEWED: 'Deal document viewed',
  DEAL_DOC_DELETED: 'Deal document deleted',
  KYC_DOC_UPLOADED: 'KYC document uploaded',
  KYC_DOC_VIEWED: 'KYC document viewed',
  APPLICATION_STATUS_CHANGED: 'Application status changed',
  PROFILE_UPDATED: 'Investor profile updated',
  PASSWORD_CHANGED: 'Password changed',
  ACCOUNT_DELETED: 'Account deleted',
  DATA_EXPORTED: 'Data export downloaded',
  TOTP_ENABLED: '2FA enabled',
  TOTP_DISABLED: '2FA disabled',
  VIEWING_REQUESTED: 'Viewing requested',
  VIEWING_DECIDED: 'Viewing decision recorded',
  ADMIN_BATCH_POST: 'Admin batch-posted deals',
  // Audit PR #4 — new event types
  PROPERTY_DELETED: 'Property deleted by admin',
  STAGE_OVERRIDE: 'Stage transition overridden by admin',
} as const

export type AuditAction = keyof typeof AUDIT_ACTIONS

export interface AuditEventInput {
  actorUserId?: string | null
  actorRole?: string | null
  action: AuditAction
  resourceType: string
  resourceId?: string | null
  metadata?: Record<string, unknown> | null
  ipAddress?: string | null
}

/**
 * Persist an audit event. Never throws — auditing should never fail the
 * underlying action. Use when something material happens (not on read).
 */
export async function recordAudit(event: AuditEventInput): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        actorUserId: event.actorUserId ?? null,
        actorRole: event.actorRole ?? null,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId ?? null,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        ipAddress: event.ipAddress ?? null,
      },
    })
  } catch (e) {
    console.error('[audit] failed to record event (non-fatal):', e)
  }
}

export function auditActionLabel(action: string): string {
  return (AUDIT_ACTIONS as Record<string, string>)[action] ?? action
}
