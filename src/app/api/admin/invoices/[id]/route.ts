import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { canTransition, defaultDueDate, type InvoiceStatus } from '@/lib/invoices'
import { z } from 'zod'

const patchSchema = z.object({
  status: z.enum(['SENT', 'PAID', 'VOID']).optional(),
  paidReference: z.string().max(255).optional(),
  amount: z.number().positive().max(1_000_000_000).optional(),
  description: z.string().min(1).max(500).optional(),
  dueAt: z.string().optional(),
})

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await ctx.params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  const d = parsed.data

  const existing = await prisma.invoice.findUnique({
    where: { id },
    include: { user: { include: { investorProfile: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const updateData: Record<string, unknown> = {}

  if (d.status) {
    if (!canTransition(existing.status as InvoiceStatus, d.status as InvoiceStatus)) {
      return NextResponse.json({ error: `Cannot transition ${existing.status} → ${d.status}` }, { status: 409 })
    }
    updateData.status = d.status
    if (d.status === 'SENT') {
      updateData.issuedAt = new Date()
      if (!existing.dueAt) updateData.dueAt = defaultDueDate()
    }
    if (d.status === 'PAID') {
      if (!d.paidReference) {
        return NextResponse.json({ error: 'paidReference required when marking PAID' }, { status: 400 })
      }
      updateData.paidAt = new Date()
      updateData.paidReference = d.paidReference
    }
  }

  // Edit fields are only allowed while still DRAFT
  if (existing.status === 'DRAFT') {
    if (d.amount !== undefined) updateData.amount = d.amount
    if (d.description !== undefined) updateData.description = d.description
    if (d.dueAt !== undefined) updateData.dueAt = d.dueAt ? new Date(d.dueAt) : null
  } else if (d.amount !== undefined || d.description !== undefined || d.dueAt !== undefined) {
    return NextResponse.json({ error: 'Cannot edit fields on an issued invoice — VOID and reissue if incorrect' }, { status: 409 })
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No changes' }, { status: 400 })
  }

  const updated = await prisma.invoice.update({ where: { id }, data: updateData })

  if (d.status === 'PAID') {
    try {
      await sendEmail({
        to: existing.user.email,
        subject: `Receipt — Invoice ${existing.invoiceNumber} paid`,
        html: `
          <p>Hello ${existing.user.investorProfile?.firstName ?? ''},</p>
          <p>Thank you — we've received your payment for invoice <strong>${existing.invoiceNumber}</strong> (£${Number(existing.amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).</p>
          <p>Reference: ${d.paidReference}</p>
          <p><a href="${process.env.NEXTAUTH_URL}/portal/invoices">View receipt →</a></p>
        `,
      })
    } catch (e) {
      console.error('Invoice paid email failed (non-fatal):', e)
    }
  } else if (d.status === 'SENT') {
    try {
      await sendEmail({
        to: existing.user.email,
        subject: `Invoice ${existing.invoiceNumber} from Rêve Bâtir`,
        html: `
          <p>Hello ${existing.user.investorProfile?.firstName ?? ''},</p>
          <p>Your invoice <strong>${existing.invoiceNumber}</strong> for <strong>£${Number(existing.amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> is ready.</p>
          <p><a href="${process.env.NEXTAUTH_URL}/portal/invoices">View & download invoice →</a></p>
        `,
      })
    } catch (e) {
      console.error('Invoice email failed (non-fatal):', e)
    }
  }

  return NextResponse.json({ success: true, invoice: updated })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await ctx.params
  const existing = await prisma.invoice.findUnique({ where: { id }, select: { status: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Only DRAFT invoices can be deleted; VOID instead' }, { status: 409 })
  }
  await prisma.invoice.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
