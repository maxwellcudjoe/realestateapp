import { prisma } from '@/lib/prisma'
import { uploadDocument } from '@/lib/azure-blob'
import { classify } from './classify'
import { detectDirection } from './direction'
import { matchToDeal, type DealLookups } from './match'
import { resolveThread, type ThreadLookups } from './thread'
import type { ParsedEmail } from './types'

export interface PersistOptions {
  internalDomains: string
  blobContainer: string
}

export interface PersistResult {
  emailId: string | null
  threadId: string | null
  dealId: string | null
  classification: string
  direction: string
  duplicate: boolean
}

interface AttachmentRecord {
  path: string
  filename: string
  size: number
  mime: string
  error?: string
}

type PrismaLike = typeof prisma

function buildLookups(db: PrismaLike) {
  const threadLookups: ThreadLookups = {
    findThreadByMessageId: async (mid) => {
      const m = await db.emailMessage.findUnique({
        where: { messageId: mid },
        select: { threadId: true, thread: { select: { dealId: true } } },
      })
      if (!m) return null
      return { id: m.threadId, dealId: m.thread.dealId }
    },
  }

  const dealLookups: DealLookups = {
    findThreadByMessageId: threadLookups.findThreadByMessageId,
    findDealByPostcode: async (postcode) => {
      // Deal model has a top-level `address` String column (schema.prisma:240).
      const deals = await db.deal.findMany({
        where: { address: { contains: postcode } },
        select: { id: true, address: true },
        take: 5,
      })
      return deals.map((d) => ({ id: d.id, address: d.address ?? '' }))
    },
    findDealByAddress: async () => null,
    findDealsByDealerEmail: async (email) => {
      const contact = await db.dealerContact.findUnique({
        where: { email },
        select: { emails: { select: { thread: { select: { dealId: true } } } } },
      })
      if (!contact) return []
      const dealIds = new Set<string>()
      for (const e of contact.emails) if (e.thread.dealId) dealIds.add(e.thread.dealId)
      return Array.from(dealIds).map((id) => ({ id }))
    },
  }
  return { threadLookups, dealLookups }
}

export async function persist(email: ParsedEmail, opts: PersistOptions): Promise<PersistResult> {
  const existing = await prisma.emailMessage.findUnique({
    where: { messageId: email.messageId },
    select: { id: true },
  })
  if (existing) {
    return {
      emailId: existing.id,
      threadId: null,
      dealId: null,
      classification: 'KEPT',
      direction: 'INBOUND',
      duplicate: true,
    }
  }

  const classification = classify(email)
  const { direction, attributedUserEmail } = detectDirection(email, opts.internalDomains)
  const { threadLookups, dealLookups } = buildLookups(prisma)
  const matched =
    classification === 'KEPT'
      ? await matchToDeal(email, dealLookups)
      : { dealId: null as string | null, confidence: 'NONE' as const }
  const thread = await resolveThread(email, threadLookups)

  const attributedUserId = attributedUserEmail
    ? (await prisma.user.findUnique({ where: { email: attributedUserEmail }, select: { id: true } }))?.id ?? null
    : null

  return prisma.$transaction(async (tx) => {
    const contact = await tx.dealerContact.upsert({
      where: { email: email.from.email.toLowerCase() },
      create: { email: email.from.email.toLowerCase(), name: email.from.name },
      update: email.from.name ? { name: email.from.name } : {},
    })

    let threadId = thread.threadId
    if (thread.isNew) {
      const created = await tx.dealerThread.create({
        data: {
          subject: thread.normalisedSubject || email.subject,
          dealId: matched.dealId,
          lastAt: email.receivedAt,
        },
      })
      threadId = created.id
    } else {
      await tx.dealerThread.update({
        where: { id: threadId },
        data: {
          lastAt: email.receivedAt,
          ...(matched.dealId ? { dealId: matched.dealId } : {}),
        },
      })
    }

    const stored = await tx.emailMessage.create({
      data: {
        messageId: email.messageId,
        inReplyTo: email.inReplyTo,
        referencesJson: email.references.length ? JSON.stringify(email.references) : null,
        threadId,
        direction,
        fromId: contact.id,
        toJson: JSON.stringify(email.to),
        ccJson: email.cc.length ? JSON.stringify(email.cc) : null,
        subject: email.subject,
        bodyText: email.bodyText,
        bodyHtml: email.bodyHtml,
        receivedAt: email.receivedAt,
        classification,
        matchConfidence: matched.confidence,
        attributedUserId,
      },
    })

    if (classification === 'KEPT' && email.attachments.length > 0) {
      const records: AttachmentRecord[] = []
      for (const att of email.attachments) {
        const path = `${opts.blobContainer}/${threadId}/${stored.id}/${att.filename}`
        try {
          await uploadDocument(att.buffer, path, att.contentType)
          records.push({ path, filename: att.filename, size: att.size, mime: att.contentType })
        } catch {
          records.push({
            path,
            filename: att.filename,
            size: att.size,
            mime: att.contentType,
            error: 'BLOB_UPLOAD_FAILED',
          })
        }
      }
      await tx.emailMessage.update({
        where: { id: stored.id },
        data: { attachmentsJson: JSON.stringify(records) },
      })
    }

    if (classification === 'KEPT') {
      await tx.auditEvent.create({
        data: {
          action: direction === 'OUTBOUND' ? 'EMAIL_SENT_LOGGED' : 'EMAIL_RECEIVED',
          actorUserId: attributedUserId,
          resourceType: 'EmailMessage',
          resourceId: stored.id,
          metadata: JSON.stringify({
            threadId,
            dealId: matched.dealId,
            from: email.from.email,
            subject: email.subject,
          }),
        },
      })
    }

    return {
      emailId: stored.id,
      threadId,
      dealId: matched.dealId,
      classification,
      direction,
      duplicate: false,
    }
  })
}
