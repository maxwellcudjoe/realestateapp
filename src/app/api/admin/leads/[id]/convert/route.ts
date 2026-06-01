import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { getClientIp } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/resend'
import { leadConversionMagicLinkHtml } from '@/lib/emails/lead-conversion'
import { generateToken, TOKEN_TTL_MS } from '@/lib/leads/token'

const Body = z.object({ adminMessage: z.string().max(2000).optional().nullable() })

export async function POST(req: NextRequest | Request, ctx: { params: { id: string } }): Promise<Response> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = ctx.params
  let body: unknown
  try { body = await req.json() } catch { body = {} }
  const parsed = Body.safeParse(body)
  const adminMessage = parsed.success ? parsed.data.adminMessage ?? null : null

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, convertedUserId: true },
  })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  if (lead.convertedUserId) return NextResponse.json({ error: 'Lead already converted' }, { status: 409 })
  if (!lead.email) return NextResponse.json({ error: 'Lead has no email — cannot send magic link' }, { status: 400 })

  const token = generateToken()
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)
  await prisma.leadConversionToken.create({
    data: { leadId: id, token, expiresAt },
  })

  const baseUrl = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
  const magicLinkUrl = `${baseUrl}/auth/finish-setup?token=${encodeURIComponent(token)}`

  const html = leadConversionMagicLinkHtml({
    leadName: lead.name,
    magicLinkUrl,
    adminMessage,
  })

  let emailSent = true
  try {
    await sendEmail({
      to: lead.email,
      subject: 'Finish setting up your Rêve Bâtir account',
      html,
    })
  } catch (e) {
    console.error('[leads] convert email send failed', e)
    emailSent = false
  }

  await recordAudit({
    action: 'LEAD_CONVERT_INITIATED',
    resourceType: 'Lead',
    resourceId: id,
    metadata: { tokenPrefix: token.slice(0, 8) + '…', expiresAt: expiresAt.toISOString(), emailSent },
    ipAddress: getClientIp(req as NextRequest),
  })

  return NextResponse.json({
    ok: true,
    magicLinkUrl,
    emailSent,
    ...(emailSent ? {} : { warning: 'Email send failed — copy the link to the lead manually' }),
  })
}
