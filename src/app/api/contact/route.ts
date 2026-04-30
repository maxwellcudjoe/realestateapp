import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendEmail } from '@/lib/resend'

const ContactSchema = z.object({
  name:      z.string().min(1, 'Name is required'),
  email:     z.string().email('Valid email required'),
  message:   z.string().min(1, 'Message is required'),
  dealTitle: z.string().optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = ContactSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { errors: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const d = result.data
  const subject = d.dealTitle
    ? `Deal Enquiry — ${d.dealTitle}`
    : `New Enquiry from ${d.name}`

  try {
    await sendEmail({
      to: process.env.RESEND_TO_EMAIL!,
      subject,
      html: `
        <h2 style="font-family:sans-serif">${subject}</h2>
        <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 16px 6px 0;color:#666">From</td><td><strong>${d.name}</strong></td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666">Email</td><td>${d.email}</td></tr>
          ${d.dealTitle ? `<tr><td style="padding:6px 16px 6px 0;color:#666">Deal</td><td>${d.dealTitle}</td></tr>` : ''}
          <tr><td style="padding:6px 16px 6px 0;color:#666;vertical-align:top">Message</td><td>${d.message}</td></tr>
        </table>
      `,
    })

    await sendEmail({
      to: d.email,
      subject: 'We received your enquiry — Dream Build Property Group',
      html: `
        <p style="font-family:sans-serif">Hi ${d.name},</p>
        <p style="font-family:sans-serif">Thank you for getting in touch. We respond to all enquiries within 24 hours.</p>
        <p style="font-family:sans-serif">— The Dream Build Property Group Team</p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to send — please try again.' },
      { status: 500 }
    )
  }
}
