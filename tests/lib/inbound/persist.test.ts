import { describe, it, expect, beforeEach, vi } from 'vitest'

const prismaMock = vi.hoisted(() => {
  const m: {
    emailMessage: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
    dealerContact: { upsert: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> }
    dealerThread: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> }
    deal: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
    user: { findUnique: ReturnType<typeof vi.fn> }
    auditEvent: { create: ReturnType<typeof vi.fn> }
    $transaction: ReturnType<typeof vi.fn>
  } = {
    emailMessage: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    dealerContact: { upsert: vi.fn(), findUnique: vi.fn() },
    dealerThread: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
    deal: { findUnique: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    auditEvent: { create: vi.fn() },
    $transaction: vi.fn(),
  }
  m.$transaction.mockImplementation(async (fn: (tx: typeof m) => Promise<unknown>) => fn(m))
  return m
})
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/azure-blob', () => ({
  uploadDocument: vi.fn(async () => undefined),
  deleteBlob: vi.fn(async () => undefined),
}))

import { persist } from '@/lib/inbound/persist'
import type { ParsedEmail } from '@/lib/inbound/types'

const dealerEmail: ParsedEmail = {
  messageId: '<lovelle-001@lovelle.co.uk>',
  inReplyTo: null,
  references: [],
  from: { email: 'holly@lovelle.co.uk', name: 'Holly Anderson' },
  to: [{ email: 'info@revebatir.co.uk', name: null }],
  cc: [],
  subject: 'RE: 16 Grimsby Road, Cleethorpes DN35 8AB',
  bodyText: 'Hi...',
  bodyHtml: null,
  receivedAt: new Date('2026-05-29T14:47:00Z'),
  attachments: [{ filename: 'brochure.pdf', contentType: 'application/pdf', size: 12, buffer: Buffer.from('%PDF-fake') }],
  rawHeaders: {},
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<unknown>) => fn(prismaMock))
  prismaMock.emailMessage.findUnique.mockResolvedValue(null)
  prismaMock.dealerContact.upsert.mockResolvedValue({ id: 'contact-1', email: 'holly@lovelle.co.uk' })
  prismaMock.dealerContact.findUnique.mockResolvedValue(null)
  prismaMock.dealerThread.create.mockResolvedValue({ id: 'thread-1' })
  prismaMock.dealerThread.findFirst.mockResolvedValue(null)
  prismaMock.deal.findMany.mockResolvedValue([{ id: 'deal-X', address: '16 Grimsby Road, Cleethorpes, DN35 8AB' }])
  prismaMock.deal.findUnique.mockResolvedValue({ id: 'deal-X' })
  prismaMock.emailMessage.create.mockResolvedValue({ id: 'email-1' })
  prismaMock.emailMessage.update.mockResolvedValue({ id: 'email-1' })
  prismaMock.auditEvent.create.mockResolvedValue({ id: 'audit-1' })
  prismaMock.user.findUnique.mockResolvedValue(null)
})

describe('persist (KEPT inbound dealer email with attachment, postcode-matched to deal)', () => {
  const opts = { internalDomains: 'revebatir.co.uk', blobContainer: 'dealer-correspondence' }

  it('upserts the dealer contact', async () => {
    await persist(dealerEmail, opts)
    expect(prismaMock.dealerContact.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: 'holly@lovelle.co.uk' },
      create: expect.objectContaining({ email: 'holly@lovelle.co.uk', name: 'Holly Anderson' }),
    }))
  })

  it('creates a new thread linked to matched deal', async () => {
    await persist(dealerEmail, opts)
    expect(prismaMock.dealerThread.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        subject: '16 Grimsby Road, Cleethorpes DN35 8AB',
        dealId: 'deal-X',
      }),
    }))
  })

  it('creates EmailMessage with classification KEPT + direction INBOUND + matchConfidence HIGH', async () => {
    await persist(dealerEmail, opts)
    expect(prismaMock.emailMessage.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        messageId: '<lovelle-001@lovelle.co.uk>',
        classification: 'KEPT',
        direction: 'INBOUND',
        matchConfidence: 'HIGH',
      }),
    }))
  })

  it('uploads each attachment and stores its blob path in attachmentsJson (NOT creating Document rows)', async () => {
    const { uploadDocument } = await import('@/lib/azure-blob')
    await persist(dealerEmail, opts)
    expect(uploadDocument).toHaveBeenCalledTimes(1)
    expect(prismaMock.emailMessage.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'email-1' },
      data: expect.objectContaining({
        attachmentsJson: expect.stringContaining('brochure.pdf'),
      }),
    }))
  })

  it('writes EMAIL_RECEIVED AuditEvent with resourceType=EmailMessage', async () => {
    await persist(dealerEmail, opts)
    expect(prismaMock.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'EMAIL_RECEIVED',
        resourceType: 'EmailMessage',
        resourceId: 'email-1',
      }),
    }))
  })

  it('is idempotent on duplicate Message-ID', async () => {
    prismaMock.emailMessage.findUnique.mockResolvedValueOnce({ id: 'existing' })
    const r = await persist(dealerEmail, opts)
    expect(r.duplicate).toBe(true)
    expect(prismaMock.emailMessage.create).not.toHaveBeenCalled()
  })

  it('records attachment upload failure but persists the email', async () => {
    const { uploadDocument } = await import('@/lib/azure-blob')
    ;(uploadDocument as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('blob 500'))
    await persist(dealerEmail, opts)
    expect(prismaMock.emailMessage.create).toHaveBeenCalled()
    expect(prismaMock.emailMessage.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        attachmentsJson: expect.stringContaining('BLOB_UPLOAD_FAILED'),
      }),
    }))
  })
})

describe('persist (DROPPED marketing email — facebook)', () => {
  const opts = { internalDomains: 'revebatir.co.uk', blobContainer: 'dealer-correspondence' }

  it('persists row with classification DROPPED_MARKETING and skips audit + attachment upload', async () => {
    const { uploadDocument } = await import('@/lib/azure-blob')
    const fb: ParsedEmail = {
      ...dealerEmail,
      messageId: '<fb-1@facebookmail.com>',
      from: { email: 'notification@facebookmail.com', name: null },
      attachments: [],
    }
    await persist(fb, opts)
    expect(prismaMock.emailMessage.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ classification: 'DROPPED_MARKETING' }),
    }))
    expect(prismaMock.auditEvent.create).not.toHaveBeenCalled()
    expect(uploadDocument).not.toHaveBeenCalled()
  })
})

describe('persist (OUTBOUND attributed by INTERNAL_DOMAINS)', () => {
  const opts = { internalDomains: 'revebatir.co.uk', blobContainer: 'dealer-correspondence' }

  it('sets direction OUTBOUND, attributes to admin user, action=EMAIL_SENT_LOGGED', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'user-admin', email: 'admin@revebatir.co.uk' })
    const out: ParsedEmail = {
      ...dealerEmail,
      messageId: '<out-1@revebatir.co.uk>',
      from: { email: 'admin@revebatir.co.uk', name: 'Admin' },
      attachments: [],
    }
    await persist(out, opts)
    expect(prismaMock.emailMessage.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        direction: 'OUTBOUND',
        attributedUserId: 'user-admin',
      }),
    }))
    expect(prismaMock.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'EMAIL_SENT_LOGGED' }),
    }))
  })
})
