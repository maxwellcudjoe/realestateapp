import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { onboardingSubmitSchema } from '@/lib/schemas/onboarding'
import { sendEmail } from '@/lib/resend'
import { verificationEmailHtml } from '@/lib/emails/verification'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

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

      const verificationToken = crypto.randomBytes(32).toString('hex')
      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: verificationToken,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
        },
      })

      return { user, application, verificationToken }
    })

    const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email/${result.verificationToken}`

    // Send emails (non-blocking — don't fail the request if email fails)
    try {
      await Promise.all([
        sendEmail({
          to: result.user.email,
          subject: 'Verify your email — Rêve Bâtir Realty',
          html: verificationEmailHtml({ firstName: d.firstName, verifyUrl }),
        }),
        sendEmail({
          to: process.env.RESEND_TO_EMAIL!,
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
