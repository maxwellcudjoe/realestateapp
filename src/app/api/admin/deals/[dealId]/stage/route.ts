import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { VALID_DEAL_STAGES, canStageTransition, dealStageLabel } from '@/lib/deal-stages'
import { sendEmail } from '@/lib/resend'
import { recordAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'
import { getClientIp } from '@/lib/rate-limit'
import { escapeHtml } from '@/lib/html-escape'
import { z } from 'zod'

const schema = z.object({
  stage: z.string().refine((s) => VALID_DEAL_STAGES.has(s), 'Unknown stage'),
  note: z.string().max(2000).optional().default(''),
  dealLeadUserId: z.string().nullable().optional(),
  solicitorContact: z.string().max(500).nullable().optional(),
  brokerContact: z.string().max(500).nullable().optional(),
  // H4 fix — allow admin to override the transition matrix in genuine edge
  // cases. Must include a reason for audit.
  override: z.boolean().optional().default(false),
  overrideReason: z.string().max(2000).optional().default(''),
})

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ dealId: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { dealId } = await ctx.params
  const { stage, note, dealLeadUserId, solicitorContact, brokerContact, override, overrideReason } = parsed.data

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      application: {
        include: { investorProfile: { include: { user: true } } },
      },
      offer: true,
    },
  })
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const stageChanged = deal.stage !== stage
  const becameCompleted = stageChanged && stage === 'COMPLETED'
  const leftCompleted = stageChanged && deal.stage === 'COMPLETED'

  // H4 fix — enforce the stage transition matrix. Admin can override with a
  // recorded reason for genuine edge cases (e.g. data fix after a misclick).
  if (stageChanged && !canStageTransition(deal.stage, stage, { override })) {
    return NextResponse.json(
      {
        error: `Cannot transition ${dealStageLabel(deal.stage)} → ${dealStageLabel(stage)}. Set override=true with an overrideReason if this is intentional.`,
        code: 'INVALID_STAGE_TRANSITION',
      },
      { status: 409 },
    )
  }
  if (override && !overrideReason) {
    return NextResponse.json(
      { error: 'overrideReason is required when override=true (recorded in stage history for audit).' },
      { status: 400 },
    )
  }

  // H2 fix — when rolling back FROM COMPLETED to anything else, refuse if a
  // Property was already auto-created. Admin must explicitly delete the
  // Property first (via DELETE /api/portal/properties/[propertyId]) so the
  // investor's portfolio stays consistent.
  if (leftCompleted) {
    const property = await prisma.property.findUnique({ where: { dealId }, select: { id: true } })
    if (property) {
      return NextResponse.json(
        {
          error: `A Property was auto-created when this deal completed. DELETE /api/admin/properties/${property.id} first if you intend to roll the deal back.`,
          code: 'PROPERTY_EXISTS',
          propertyId: property.id,
        },
        { status: 409 },
      )
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: dealId },
      data: {
        stage,
        dealLeadUserId: dealLeadUserId ?? deal.dealLeadUserId,
        solicitorContact: solicitorContact ?? deal.solicitorContact,
        brokerContact: brokerContact ?? deal.brokerContact,
      },
    })
    if (stageChanged) {
      const historyNote = override
        ? `[OVERRIDE] ${overrideReason}${note ? ` — ${note}` : ''}`
        : note || null
      await tx.dealStageHistory.create({
        data: {
          dealId,
          fromStage: deal.stage,
          toStage: stage,
          changedByUserId: session.user.id,
          note: historyNote,
        },
      })
    }

    // Auto-create Property when deal reaches COMPLETED (Task 5.1)
    if (becameCompleted) {
      const existing = await tx.property.findUnique({ where: { dealId } })
      if (!existing) {
        const purchasePrice = deal.offer?.status === 'ACCEPTED' && deal.offer.amount
          ? Number(deal.offer.amount)
          : Number(deal.askingPrice)
        await tx.property.create({
          data: {
            userId: deal.application.investorProfile.userId,
            dealId: deal.id,
            address: deal.address,
            purchasePrice,
            completionDate: new Date(),
            propertyType: deal.propertyType,
            bedrooms: deal.bedrooms,
            bathrooms: deal.bathrooms,
            monthlyRent: deal.rentalAppraisalMonthly,
          },
        })
      }
    }
  })

  if (stageChanged) {
    await recordAudit({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: 'DEAL_STAGE_CHANGED',
      resourceType: 'Deal',
      resourceId: dealId,
      metadata: { from: deal.stage, to: stage, note: note || null },
      ipAddress: getClientIp(req),
    })
    await createNotification({
      userId: deal.application.investorProfile.userId,
      type: 'DEAL_STAGE',
      title: `Deal moved to ${dealStageLabel(stage)}`,
      body: `${deal.address}${note ? ` — ${note}` : ''}`,
      link: `/portal/deals/${dealId}`,
    })
  }

  // Email investor on stage change (non-fatal)
  if (stageChanged && deal.application.investorProfile.user.email) {
    try {
      const safeFirstName = escapeHtml(deal.application.investorProfile.firstName)
      const safeAddress = escapeHtml(deal.address)
      const safeNote = escapeHtml(note)
      await sendEmail({
        to: deal.application.investorProfile.user.email,
        subject: `Deal update — ${deal.title}: ${dealStageLabel(stage)}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0e8d8;padding:40px">
            <h1 style="color:#c9a84c;font-size:24px;font-weight:300">Deal Update</h1>
            <p>Dear ${safeFirstName},</p>
            <p>Your deal at <strong>${safeAddress}</strong> has moved to <strong style="color:#c9a84c">${dealStageLabel(stage)}</strong>.</p>
            ${note ? `<p style="border-left:2px solid #c9a84c;padding-left:16px;color:#b3b3b3;font-style:italic">${safeNote}</p>` : ''}
            <p><a href="${process.env.NEXTAUTH_URL}/portal/deals" style="color:#c9a84c">View full deal status →</a></p>
          </div>
        `,
      })
    } catch (e) {
      console.error('Deal stage email failed (non-fatal):', e)
    }
  }

  return NextResponse.json({ success: true })
}
