import { describe, it, expect, beforeEach, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => {
  const mock: {
    lead: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
    user: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
    investorProfile: {
      create: ReturnType<typeof vi.fn>
      findUnique: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
    }
    application: {
      create: ReturnType<typeof vi.fn>
      findUnique: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
    }
    investorStrategy: { createMany: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
    targetArea: { createMany: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
    auditEvent: { create: ReturnType<typeof vi.fn> }
    $transaction: ReturnType<typeof vi.fn>
  } = {
    lead: { findUnique: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn() },
    investorProfile: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    application: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    investorStrategy: { createMany: vi.fn(), findMany: vi.fn() },
    targetArea: { createMany: vi.fn(), findMany: vi.fn() },
    auditEvent: { create: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(mock)),
  }
  return { prismaMock: mock }
})
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(async () => 'hashed-pw') },
  hash: vi.fn(async () => 'hashed-pw'),
}))

import { convertLead } from '@/lib/leads/convert'

const leadRow = {
  id: 'lead-1',
  name: 'Alice Buyer',
  email: 'alice@example.com',
  phone: '+447700900111',
  strategyCodesJson: '["BTL","HMO"]',
  targetAreaCodesJson: '["LE1","LE2"]',
  budgetMin: { toString: () => '100000' },
  budgetMax: { toString: () => '250000' },
  experienceLevel: 'FIRST_TIME',
  timeline: '3_MONTHS',
  fundingStatus: 'MORTGAGE_AGREED',
  status: 'QUALIFIED',
  convertedUserId: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.lead.findUnique.mockResolvedValue(leadRow)
  prismaMock.user.findUnique.mockResolvedValue(null)
  prismaMock.user.create.mockResolvedValue({ id: 'user-new', email: 'alice@example.com' })
  prismaMock.investorProfile.create.mockResolvedValue({ id: 'profile-1' })
  prismaMock.investorProfile.findUnique.mockResolvedValue({
    id: 'profile-1',
    timelineToBuy: null,
    experienceLevel: null,
    mortgageStatus: null,
    budgetMin: null,
    budgetMax: null,
  })
  prismaMock.investorProfile.update.mockResolvedValue({ id: 'profile-1' })
  prismaMock.application.create.mockResolvedValue({ id: 'app-1' })
  prismaMock.application.findUnique.mockResolvedValue({ id: 'app-1' })
  prismaMock.investorStrategy.findMany.mockResolvedValue([])
  prismaMock.targetArea.findMany.mockResolvedValue([])
  prismaMock.investorStrategy.createMany.mockResolvedValue({ count: 2 })
  prismaMock.targetArea.createMany.mockResolvedValue({ count: 2 })
  prismaMock.lead.update.mockResolvedValue({ ...leadRow, convertedUserId: 'user-new', status: 'CONVERTED' })
  prismaMock.auditEvent.create.mockResolvedValue({ id: 'audit-1' })
})

describe('convertLead — magic-link path (creates new User)', () => {
  it('creates User with hashed password, profile, application, strategy + area rows', async () => {
    const r = await convertLead('lead-1', { password: 'StrongPassw0rd!', consents: { gdpr: true } })
    expect(r.userId).toBe('user-new')
    expect(prismaMock.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ email: 'alice@example.com', passwordHash: 'hashed-pw' }),
    }))
    expect(prismaMock.investorStrategy.createMany).toHaveBeenCalled()
    expect(prismaMock.targetArea.createMany).toHaveBeenCalled()
  })

  it('marks the lead converted and links to the new user', async () => {
    await convertLead('lead-1', { password: 'StrongPassw0rd!', consents: { gdpr: true } })
    expect(prismaMock.lead.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'lead-1' },
      data: expect.objectContaining({ convertedUserId: 'user-new', status: 'CONVERTED' }),
    }))
  })

  it('writes LEAD_CONVERTED AuditEvent', async () => {
    await convertLead('lead-1', { password: 'StrongPassw0rd!', consents: { gdpr: true } })
    expect(prismaMock.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'LEAD_CONVERTED' }),
    }))
  })

  it('throws when lead not found', async () => {
    prismaMock.lead.findUnique.mockResolvedValueOnce(null)
    await expect(convertLead('missing', { password: 'x', consents: { gdpr: true } })).rejects.toThrow(/not found/i)
  })

  it('throws when lead already converted', async () => {
    prismaMock.lead.findUnique.mockResolvedValueOnce({ ...leadRow, convertedUserId: 'user-existing' })
    await expect(convertLead('lead-1', { password: 'x', consents: { gdpr: true } })).rejects.toThrow(/already converted/i)
  })

  it('throws when lead has no email', async () => {
    prismaMock.lead.findUnique.mockResolvedValueOnce({ ...leadRow, email: null })
    await expect(convertLead('lead-1', { password: 'x', consents: { gdpr: true } })).rejects.toThrow(/email required/i)
  })
})

describe('convertLead — auto-match path (adopts existing User)', () => {
  it('does NOT create a new User; unions strategies and fills intent gaps on InvestorProfile (null-conflict rules)', async () => {
    // Existing profile has timelineToBuy set (user wins) but no experience/mortgageStatus
    prismaMock.investorProfile.findUnique.mockResolvedValueOnce({
      id: 'profile-existing',
      timelineToBuy: 'IMMEDIATE',
      experienceLevel: null,
      mortgageStatus: null,
      budgetMin: null,
      budgetMax: null,
    })
    prismaMock.investorStrategy.findMany.mockResolvedValueOnce([{ strategy: 'FLIP' }])
    prismaMock.targetArea.findMany.mockResolvedValueOnce([{ code: 'LE3' }])

    const r = await convertLead('lead-1', {
      existingUserId: 'user-existing',
      existingApplicationId: 'app-existing',
      existingInvestorProfileId: 'profile-existing',
    })

    expect(r.userId).toBe('user-existing')
    expect(r.fromAutoMatch).toBe(true)
    expect(prismaMock.user.create).not.toHaveBeenCalled()

    // Union strategies — only new ones (BTL, HMO) added; FLIP already present
    expect(prismaMock.investorStrategy.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ strategy: 'BTL', investorProfileId: 'profile-existing' }),
        expect.objectContaining({ strategy: 'HMO', investorProfileId: 'profile-existing' }),
      ]),
    }))

    // Union areas — only LE1, LE2 added; LE3 already present
    expect(prismaMock.targetArea.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ code: 'LE1', investorProfileId: 'profile-existing' }),
        expect.objectContaining({ code: 'LE2', investorProfileId: 'profile-existing' }),
      ]),
    }))

    // InvestorProfile.update should NOT overwrite timelineToBuy (user has IMMEDIATE)
    // but SHOULD fill experienceLevel and mortgageStatus (currently null)
    expect(prismaMock.investorProfile.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'profile-existing' },
      data: expect.not.objectContaining({ timelineToBuy: expect.anything() }),
    }))
    expect(prismaMock.investorProfile.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ experienceLevel: 'FIRST_TIME', mortgageStatus: 'MORTGAGE_AGREED' }),
    }))

    expect(prismaMock.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'LEAD_AUTO_MERGED' }),
    }))
  })
})
