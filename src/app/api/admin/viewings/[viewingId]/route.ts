import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { createNotification } from '@/lib/notifications'
import { z } from 'zod'

const schema = z.object({
  status: z.enum(['CONFIRMED', 'DECLINED', 'COMPLETED', 'CANCELLED']),
  confirmedSlot: z.string().optional().default(''),
  adminNote: z.string().max(1000).optional().default(''),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ viewingId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { viewingId } = await ctx.params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const viewing = await prisma.viewing.findUnique({
    where: { id: viewingId },
    include: { deal: { include: { application: { include: { investorProfile: { include: { user: { select: { email: true } } } } } } } } },
  })
  if (!viewing) return NextResponse.json({ error: 'Viewing not found' }, { status: 404 })

  const confirmedSlot = parsed.data.confirmedSlot ? new Date(parsed.data.confirmedSlot) : null
  if (parsed.data.status === 'CONFIRMED' && (!confirmedSlot || isNaN(confirmedSlot.getTime()))) {
    return NextResponse.json({ error: 'Confirmed status requires a confirmed slot.' }, { status: 400 })
  }

  await prisma.viewing.update({
    where: { id: viewingId },
    data: {
      status: parsed.data.status,
      confirmedSlot: confirmedSlot ?? viewing.confirmedSlot,
      adminNote: parsed.data.adminNote || viewing.adminNote,
    },
  })

  await createNotification({
    userId: viewing.investorUserId,
    type: 'VIEWING',
    title: `Viewing ${parsed.data.status.toLowerCase()} — ${viewing.deal.address}`,
    body: confirmedSlot
      ? `Confirmed for ${confirmedSlot.toLocaleString('en-GB')}${parsed.data.adminNote ? ` — ${parsed.data.adminNote}` : ''}`
      : parsed.data.adminNote || `Status: ${parsed.data.status.toLowerCase()}`,
    link: `/portal/deals/${viewing.dealId}`,
  })

  try {
    await sendEmail({
      to: viewing.deal.application.investorProfile.user.email,
      subject: `Viewing ${parsed.data.status.toLowerCase()} — ${viewing.deal.address}`,
      html: `<p>Your viewing of <strong>${viewing.deal.address}</strong> has been <strong>${parsed.data.status.toLowerCase()}</strong>${confirmedSlot ? ` for <strong>${confirmedSlot.toLocaleString('en-GB')}</strong>` : ''}.</p>
             ${parsed.data.adminNote ? `<p style="border-left:2px solid #c9a84c;padding-left:16px"><em>${parsed.data.adminNote}</em></p>` : ''}
             <p><a href="${process.env.NEXTAUTH_URL}/portal/deals/${viewing.dealId}">View deal →</a></p>`,
    })
  } catch (e) {
    console.error('Viewing decision email failed (non-fatal):', e)
  }

  return NextResponse.json({ success: true })
}
