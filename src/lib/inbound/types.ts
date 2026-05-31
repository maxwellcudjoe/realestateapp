export type EmailDirection = 'INBOUND' | 'OUTBOUND'
export type EmailClassification = 'KEPT' | 'DROPPED_MARKETING' | 'DROPPED_AUTO' | 'MANUAL_DROP'
export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'NONE'

export interface ParsedAttachment {
  filename: string
  contentType: string
  size: number
  buffer: Buffer
}

export interface ParsedEmail {
  messageId: string
  inReplyTo: string | null
  references: string[]
  from: { email: string; name: string | null }
  to: Array<{ email: string; name: string | null }>
  cc: Array<{ email: string; name: string | null }>
  subject: string
  bodyText: string
  bodyHtml: string | null
  receivedAt: Date
  attachments: ParsedAttachment[]
  rawHeaders: Record<string, string>
}
