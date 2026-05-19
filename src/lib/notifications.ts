import { prisma } from '@/lib/prisma'

export const NOTIFICATION_TYPES = {
  DEAL_POSTED:          'New deal posted',
  DEAL_STAGE:           'Deal stage change',
  OFFER_DECISION:       'Offer decision',
  MESSAGE:              'New message',
  KYC_STATUS:           'KYC status update',
  VIEWING:              'Viewing update',
  SYSTEM:               'System notification',
  SUBSCRIPTION_REQUEST: 'Subscription request',
} as const

export type NotificationType = keyof typeof NOTIFICATION_TYPES

interface CreateInput {
  userId: string
  type: NotificationType
  title: string
  body: string
  link?: string
}

/** Persist a notification. Never throws — telemetry must not break the action. */
export async function createNotification(input: CreateInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
      },
    })
  } catch (e) {
    console.error('[notifications] create failed (non-fatal):', e)
  }
}

export function notificationTypeLabel(t: string): string {
  return (NOTIFICATION_TYPES as Record<string, string>)[t] ?? t
}
