import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { onboardingSubmitSchema } from '@/lib/schemas/onboarding'
import { sendEmail } from '@/lib/resend'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = onboardingSubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const d = parsed.data

  // Check duplicate email
  const existing = await prisma.user.findUnique({ where: { email: d.email } })
  if (existing) {
    return NextResponse.json(
      { errors: { email: ['An account with this email already exists'] } },
      { status: 422 },
    )
  }

  try {
    const passwordHash = await bcrypt.hash(d.password, 12)

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: d.email, passwordHash, role: 'investor' },
      })

      const profile = await tx.investorProfile.create({
        data: {
          userId: user.id,
          firstName: d.firstName,
          lastName: d.lastName,
          phone: d.phone,
          addressLine1: d.addressLine1,
          city: d.city,
          postcode: d.postcode,
          budgetMin: d.budgetMin,
          budgetMax: d.budgetMax,
          strategy: d.strategy,
          buyerType: d.buyerType,
          targetAreas: d.targetAreas,
        },
      })

      const application = await tx.application.create({
        data: { investorProfileId: profile.id, status: 'SUBMITTED' },
      })

      await tx.statusHistory.create({
        data: {
          applicationId: application.id,
          fromStatus: null,
          toStatus: 'SUBMITTED',
          note: 'Application submitted',
        },
      })

      return { user, application }
    })

    // Send emails (non-blocking — don't fail the request if email fails)
    try {
      await Promise.all([
        sendEmail({
          to: result.user.email,
          subject: 'Application received — Rêve Bâtir Realty',
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0e8d8;padding:40px">
              <h1 style="color:#c9a84c;font-size:24px;font-weight:300">Application Received</h1>
              <p>Dear ${d.firstName},</p>
              <p>Thank you for registering with Rêve Bâtir Realty. We have received your investor application and our team will review it within 48 hours.</p>
              <p>You can track your application status at any time by logging into your <a href="${process.env.NEXTAUTH_URL}/portal/status" style="color:#c9a84c">investor portal</a>.</p>
              <hr style="border:none;border-top:1px solid #1e1e1e;margin:24px 0"/>
              <p style="font-size:12px;color:#888">Rêve Bâtir Realty — Property Deal Sourcing</p>
            </div>
          `,
        }),
        sendEmail({
          to: 'info@revebatir.co.uk',
          subject: `New investor application — ${d.firstName} ${d.lastName}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px">
              <h2>New Investor Application</h2>
              <table style="font-size:14px;border-collapse:collapse">
                <tr><td style="padding:6px 16px 6px 0;color:#666">Name</td><td><strong>${d.firstName} ${d.lastName}</strong></td></tr>
                <tr><td style="padding:6px 16px 6px 0;color:#666">Email</td><td>${d.email}</td></tr>
                <tr><td style="padding:6px 16px 6px 0;color:#666">Phone</td><td>${d.phone}</td></tr>
                <tr><td style="padding:6px 16px 6px 0;color:#666">Budget</td><td>£${d.budgetMin.toLocaleString()} – £${d.budgetMax.toLocaleString()}</td></tr>
                <tr><td style="padding:6px 16px 6px 0;color:#666">Strategy</td><td>${d.strategy}</td></tr>
                <tr><td style="padding:6px 16px 6px 0;color:#666">Buyer Type</td><td>${d.buyerType}</td></tr>
                <tr><td style="padding:6px 16px 6px 0;color:#666">Areas</td><td>${d.targetAreas}</td></tr>
              </table>
              <p><a href="${process.env.NEXTAUTH_URL}/admin/investors">View in dashboard →</a></p>
            </div>
          `,
        }),
      ])
    } catch (emailErr) {
      console.error('Email send failed (non-fatal):', emailErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('/api/onboarding error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
