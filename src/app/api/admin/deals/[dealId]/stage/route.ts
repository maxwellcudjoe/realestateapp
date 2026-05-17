import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { VALID_DEAL_STAGES, dealStageLabel } from '@/lib/deal-stages'
import { sendEmail } from '@/lib/resend'
import { z } from 'zod'

const schema = z.object({
  stage: z.string().refine((s) => VALID_DEAL_STAGES.has(s), 'Unknown stage'),
  note: z.string().max(2000).optional().default(''),
  dealLeadUserId: z.string().nullable().optional(),
  solicitorContact: z.string().max(500).nullable().optional(),
  brokerContact: z.string().max(500).nullable().optional(),
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
  const { stage, note, dealLeadUserId, solicitorContact, brokerContact } = parsed.data

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      application: {
        include: { investorProfile: { include: { user: true } } },
      },
    },
  })
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const stageChanged = deal.stage !== stage

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
      await tx.dealStageHistory.create({
        data: {
          dealId,
          fromStage: deal.stage,
          toStage: stage,
          changedByUserId: session.user.id,
          note: note || null,
        },
      })
    }
  })

  // Email investor on stage change (non-fatal)
  if (stageChanged && deal.application.investorProfile.user.email) {
    try {
      await sendEmail({
        to: deal.application.investorProfile.user.email,
        subject: `Deal update — ${deal.title}: ${dealStageLabel(stage)}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0e8d8;padding:40px">
            <h1 style="color:#c9a84c;font-size:24px;font-weight:300">Deal Update</h1>
            <p>Dear ${deal.application.investorProfile.firstName},</p>
            <p>Your deal at <strong>${deal.address}</strong> has moved to <strong style="color:#c9a84c">${dealStageLabel(stage)}</strong>.</p>
            ${note ? `<p style="border-left:2px solid #c9a84c;padding-left:16px;color:#b3b3b3;font-style:italic">${note}</p>` : ''}
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
