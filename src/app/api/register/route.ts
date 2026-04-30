import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendEmail } from '@/lib/resend'

const RegisterSchema = z.object({
  name:      z.string().min(1, 'Name is required'),
  email:     z.string().email('Valid email required'),
  phone:     z.string().optional().default(''),
  budget:    z.string().min(1, 'Budget is required'),
  strategy:  z.enum(['BTL', 'HMO', 'Flip', 'All']),
  buyerType: z.enum(['Cash', 'Mortgage']),
  areas:     z.string().min(1, 'Preferred areas required'),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = RegisterSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { errors: result.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const d = result.data
  try {
    await sendEmail({
      to: process.env.RESEND_TO_EMAIL!,
      subject: `New Investor Registration — ${d.name}`,
      html: `
        <h2 style="font-family:sans-serif">New Investor Registration</h2>
        <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 16px 6px 0;color:#666">Name</td><td><strong>${d.name}</strong></td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666">Email</td><td>${d.email}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666">Phone</td><td>${d.phone || 'Not provided'}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666">Budget</td><td>${d.budget}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666">Strategy</td><td>${d.strategy}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666">Buyer Type</td><td>${d.buyerType}</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#666">Areas</td><td>${d.areas}</td></tr>
        </table>
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
