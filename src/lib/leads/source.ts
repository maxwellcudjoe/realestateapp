import type { LeadSourceChannel, LeadStatus } from './types'

export const SOURCE_CHANNELS: readonly LeadSourceChannel[] = [
  'PHONE_CALL',
  'PARTNER_INTRO',
  'AGENT_REFERRAL',
  'WALK_IN',
  'EVENT',
  'WEB_ENQUIRY',
  'OTHER',
]

export const LEAD_STATUSES: readonly LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'CONVERTED',
  'DECLINED',
  'DORMANT',
]

const CHANNEL_LABELS: Record<LeadSourceChannel, string> = {
  PHONE_CALL: 'Phone call',
  PARTNER_INTRO: 'Partner intro',
  AGENT_REFERRAL: 'Agent referral',
  WALK_IN: 'Walk-in',
  EVENT: 'Event',
  WEB_ENQUIRY: 'Web enquiry',
  OTHER: 'Other',
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  CONVERTED: 'Converted',
  DECLINED: 'Declined',
  DORMANT: 'Dormant',
}

export function isValidSourceChannel(v: string): v is LeadSourceChannel {
  return (SOURCE_CHANNELS as readonly string[]).includes(v)
}

export function isValidStatus(v: string): v is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(v)
}

export function sourceChannelLabel(c: LeadSourceChannel): string {
  return CHANNEL_LABELS[c] ?? c
}

export function statusLabel(s: LeadStatus): string {
  return STATUS_LABELS[s] ?? s
}

export function parseCodesJson(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string')
  } catch {
    return []
  }
}

export function encodeCodesJson(codes: string[]): string | null {
  const seen = new Set<string>()
  const clean: string[] = []
  for (const raw of codes) {
    const t = raw.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    clean.push(t)
  }
  return clean.length === 0 ? null : JSON.stringify(clean)
}
