import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { z } from 'zod'

const schema = z.object({
  applicationIds: z.array(z.string()).min(1).max(200),
  title: z.string().min(1).max(255),
  address: z.string().min(1).max(255),
  askingPrice: z.number().positive(),
  summary: z.string().max(5000).optional().default(''),
})

/** Fan-out: create a Deal row for each selected investor application + send email. */
export async function POST(req: NextRequest) {
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
  const d = parsed.data

  // Resolve recipient emails up front so we can email after the transaction
  const apps = await prisma.application.findMany({
    where: { id: { in: d.applicationIds }, status: 'ACTIVE_INVESTOR' },
    include: { investorProfile: { include: { user: { select: { email: true } } } } },
  })
  if (apps.length === 0) {
    return NextResponse.json({ error: 'No eligible recipients found' }, { status: 400 })
  }

  // Create deals in a single transaction
  await prisma.$transaction(
    apps.map((app) =>
      prisma.deal.create({
        data: {
          applicationId: app.id,
          postedByUserId: session.user.id,
          title: d.title,
          address: d.address,
          askingPrice: d.askingPrice,
          summary: d.summary || null,
        },
      })
    )
  )

  // Fire emails (non-fatal, in parallel)
  const subject = `New deal pack — ${d.title}`
  const priceFmt = `£${d.askingPrice.toLocaleString('en-GB')}`
  const portalUrl = `${process.env.NEXTAUTH_URL}/portal/deals`
  await Promise.allSettled(apps.map((app) =>
    sendEmail({
      to: app.investorProfile.user.email,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0e8d8;padding:40px">
          <h1 style="color:#c9a84c;font-size:24px;font-weight:300">New Matched Deal</h1>
          <p>Dear ${app.investorProfile.firstName},</p>
          <p>We've matched a new deal to your criteria:</p>
          <p style="font-size:18px;color:#c9a84c">${d.title}</p>
          <p>${d.address} · ${priceFmt}</p>
          ${d.summary ? `<p style="border-left:2px solid #c9a84c;padding-left:16px;color:#b3b3b3;font-style:italic">${d.summary}</p>` : ''}
          <p><a href="${portalUrl}" style="color:#c9a84c">View deal in your portal →</a></p>
        </div>
      `,
    }).catch((e) => console.error('Batch deal email failed (non-fatal):', e))
  ))

  return NextResponse.json({ success: true, posted: apps.length })
}
