import { describe, it, expect } from 'vitest'
import {
  isValidSourceChannel,
  isValidStatus,
  sourceChannelLabel,
  statusLabel,
  parseCodesJson,
  encodeCodesJson,
  SOURCE_CHANNELS,
  LEAD_STATUSES,
} from '@/lib/leads/source'

describe('isValidSourceChannel', () => {
  it('accepts all canonical channels', () => {
    for (const c of ['PHONE_CALL', 'PARTNER_INTRO', 'AGENT_REFERRAL', 'WALK_IN', 'EVENT', 'WEB_ENQUIRY', 'OTHER']) {
      expect(isValidSourceChannel(c)).toBe(true)
    }
  })
  it('rejects garbage', () => {
    expect(isValidSourceChannel('TELEPATHY')).toBe(false)
    expect(isValidSourceChannel('')).toBe(false)
    expect(isValidSourceChannel('phone_call')).toBe(false)
  })
  it('exposes SOURCE_CHANNELS array (7 entries)', () => {
    expect(SOURCE_CHANNELS).toHaveLength(7)
  })
})

describe('isValidStatus', () => {
  it('accepts all 6 statuses', () => {
    for (const s of ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'DECLINED', 'DORMANT']) {
      expect(isValidStatus(s)).toBe(true)
    }
  })
  it('rejects garbage', () => {
    expect(isValidStatus('OPEN')).toBe(false)
    expect(isValidStatus('')).toBe(false)
  })
  it('exposes LEAD_STATUSES array (6 entries)', () => {
    expect(LEAD_STATUSES).toHaveLength(6)
  })
})

describe('sourceChannelLabel', () => {
  it('returns human label for each channel', () => {
    expect(sourceChannelLabel('PHONE_CALL')).toBe('Phone call')
    expect(sourceChannelLabel('PARTNER_INTRO')).toBe('Partner intro')
    expect(sourceChannelLabel('AGENT_REFERRAL')).toBe('Agent referral')
    expect(sourceChannelLabel('WEB_ENQUIRY')).toBe('Web enquiry')
    expect(sourceChannelLabel('OTHER')).toBe('Other')
  })
  it('returns the input unchanged for unknown values', () => {
    expect(sourceChannelLabel('XYZ' as never)).toBe('XYZ')
  })
})

describe('statusLabel', () => {
  it('returns human label', () => {
    expect(statusLabel('NEW')).toBe('New')
    expect(statusLabel('QUALIFIED')).toBe('Qualified')
    expect(statusLabel('CONVERTED')).toBe('Converted')
    expect(statusLabel('DECLINED')).toBe('Declined')
    expect(statusLabel('DORMANT')).toBe('Dormant')
  })
})

describe('parseCodesJson', () => {
  it('returns [] for null / empty / invalid JSON', () => {
    expect(parseCodesJson(null)).toEqual([])
    expect(parseCodesJson('')).toEqual([])
    expect(parseCodesJson('{not json')).toEqual([])
  })
  it('parses array of strings', () => {
    expect(parseCodesJson('["BTL","HMO"]')).toEqual(['BTL', 'HMO'])
  })
  it('filters non-strings out defensively', () => {
    expect(parseCodesJson('["BTL", 42, null, "HMO"]')).toEqual(['BTL', 'HMO'])
  })
})

describe('encodeCodesJson', () => {
  it('returns null for empty array (no need to store)', () => {
    expect(encodeCodesJson([])).toBeNull()
  })
  it('returns JSON string for non-empty array', () => {
    expect(encodeCodesJson(['BTL', 'HMO'])).toBe('["BTL","HMO"]')
  })
  it('dedupes and trims', () => {
    expect(encodeCodesJson(['BTL', ' BTL ', '', 'HMO'])).toBe('["BTL","HMO"]')
  })
})
