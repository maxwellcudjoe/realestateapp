export type LeadSourceChannel =
  | 'PHONE_CALL'
  | 'PARTNER_INTRO'
  | 'AGENT_REFERRAL'
  | 'WALK_IN'
  | 'EVENT'
  | 'WEB_ENQUIRY'
  | 'OTHER'

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'CONVERTED'
  | 'DECLINED'
  | 'DORMANT'

export interface LeadIntent {
  strategyCodes: string[]
  targetAreaCodes: string[]
  budgetMin: number | null
  budgetMax: number | null
  experienceLevel: string | null
  timeline: string | null
  fundingStatus: string | null
}
