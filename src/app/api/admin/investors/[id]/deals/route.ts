import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { recordAudit } from '@/lib/audit'
import { getClientIp } from '@/lib/rate-limit'
import { z } from 'zod'

const dealSchema = z.object({
  title: z.string().min(1).max(255),
  address: z.string().min(1).max(255),
  askingPrice: z.number().positive(),
  summary: z.string().optional(),
  // Task 4.3 — optional structured property data
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().int().min(0).max(50).optional(),
  propertyType: z.string().max(30).optional(),
  tenure: z.string().max(20).optional(),
  epcRating: z.string().max(2).optional(),
  rentalAppraisalMonthly: z.number().nonnegative().optional(),
  floorAreaSqft: z.number().int().nonnegative().optional(),
  // Leads Task 11 — optional source attribution
  sourceChannel: z
    .enum(['AGENT_EMAIL', 'SOURCER', 'PARTNER_INTRO', 'LEAD_REQUEST', 'DIRECT_VENDOR', 'OTHER'])
    .optional(),
  sourceLeadId: z.string().optional().nullable(),
  sourceContactId: z.string().optional().nullable(),
  sourceNote: z.string().max(5000).optional().nullable(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const deals = await prisma.deal.findMany({
    where: { applicationId: params.id },
    orderBy: { createdAt: 'desc' },
    include: { response: true },
  })

  return NextResponse.json({ deals })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = dealSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const app = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      investorProfile: {
        include: { user: { select: { email: true } } },
      },
    },
  })
  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  const d = parsed.data

  // Leads Task 11 — validate optional source FKs
  if (d.sourceLeadId) {
    const lead = await prisma.lead.findUnique({ where: { id: d.sourceLeadId }, select: { id: true } })
    if (!lead) return NextResponse.json({ error: 'sourceLeadId references unknown Lead' }, { status: 400 })
  }
  if (d.sourceContactId) {
    const contact = await prisma.dealerContact.findUnique({ where: { id: d.sourceContactId }, select: { id: true } })
    if (!contact) return NextResponse.json({ error: 'sourceContactId references unknown DealerContact' }, { status: 400 })
  }

  const deal = await prisma.deal.create({
    data: {
      applicationId: params.id,
      postedByUserId: session.user.id,
      title: d.title,
      address: d.address,
      askingPrice: d.askingPrice,
      summary: d.summary,
      bedrooms: d.bedrooms ?? null,
      bathrooms: d.bathrooms ?? null,
      propertyType: d.propertyType || null,
      tenure: d.tenure || null,
      epcRating: d.epcRating || null,
      rentalAppraisalMonthly: d.rentalAppraisalMonthly ?? null,
      floorAreaSqft: d.floorAreaSqft ?? null,
      // Leads Task 11 — optional source attribution
      sourceChannel: d.sourceChannel ?? null,
      sourceLeadId: d.sourceLeadId ?? null,
      sourceContactId: d.sourceContactId ?? null,
      sourceNote: d.sourceNote ?? null,
      // Task 7.4 — drives the FREE-tier 48h preview gate (PREMIUM bypasses)
      publishedAt: new Date(),
    },
  })

  const hasSource = !!(d.sourceChannel || d.sourceLeadId || d.sourceContactId || d.sourceNote)
  if (hasSource) {
    await recordAudit({
      actorUserId: session.user.id,
      actorRole: session.user.role,
      action: 'DEAL_SOURCE_ATTRIBUTED',
      resourceType: 'Deal',
      resourceId: deal.id,
      metadata: {
        sourceChannel: d.sourceChannel ?? null,
        sourceLeadId: d.sourceLeadId ?? null,
        sourceContactId: d.sourceContactId ?? null,
      },
      ipAddress: getClientIp(req as unknown as Request),
    })
  }

  try {
    const firstName = app.investorProfile.firstName
    const investorEmail = app.investorProfile.user.email
    const priceFormatted = `£${Number(parsed.data.askingPrice).toLocaleString('en-GB')}`

    await sendEmail({
      to: investorEmail,
      subject: 'A new deal has been matched to your profile — Rêve Bâtir Realty',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0e8d8;padding:40px">
          <h1 style="color:#c9a84c;font-size:22px;font-weight:300">A new deal has been matched to your profile</h1>
          <p>Dear ${firstName},</p>
          <div style="margin:24px 0;padding:20px;background:#1a1a1a;border-left:2px solid #c9a84c">
            <p style="margin:0 0 8px;color:#c9a84c;font-size:12px;text-transform:uppercase;letter-spacing:0.1em">${parsed.data.address}</p>
            <p style="margin:0 0 8px;font-size:20px;font-weight:300">${parsed.data.title}</p>
            <p style="margin:0;color:#c9a84c;font-size:18px">${priceFormatted}</p>
            ${parsed.data.summary ? `<p style="margin:16px 0 0;color:#b3b3b3;font-size:14px">${parsed.data.summary}</p>` : ''}
          </div>
          <p>Log in to your investor portal to view the full details and submit your response.</p>
          <p><a href="${process.env.NEXTAUTH_URL}/portal/deals" style="color:#c9a84c;font-weight:bold">View Deal &amp; Respond →</a></p>
          <hr style="border:none;border-top:1px solid #1e1e1e;margin:24px 0"/>
          <p style="font-size:12px;color:#888">Rêve Bâtir Realty — Property Deal Sourcing</p>
        </div>
      `,
    })
  } catch (e) {
    console.error('Deal notification email failed (non-fatal):', e)
  }

  return NextResponse.json({ success: true, dealId: deal.id })
}
