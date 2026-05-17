import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { INVOICE_TYPES, INVOICE_TYPE_LABELS, defaultDueDate, type InvoiceType } from '@/lib/invoices'
import { nextInvoiceNumber } from '@/lib/invoice-numbering'
import { z } from 'zod'

const createSchema = z.object({
  userId: z.string().min(1),
  dealId: z.string().min(1).optional().nullable(),
  type: z.enum(INVOICE_TYPES),
  amount: z.number().positive().max(1_000_000_000),
  description: z.string().min(1).max(500),
  dueAt: z.string().optional().nullable(),
  sendNow: z.boolean().optional().default(true),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const userId = req.nextUrl.searchParams.get('userId') ?? undefined
  const invoices = await prisma.invoice.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { email: true } }, deal: { select: { address: true } } },
  })
  return NextResponse.json({
    invoices: invoices.map((i) => ({
      ...i,
      amount: Number(i.amount),
      issuedAt: i.issuedAt?.toISOString() ?? null,
      dueAt: i.dueAt?.toISOString() ?? null,
      paidAt: i.paidAt?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  const d = parsed.data

  const customer = await prisma.user.findUnique({
    where: { id: d.userId },
    include: { investorProfile: true },
  })
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  if (d.dealId) {
    const deal = await prisma.deal.findUnique({ where: { id: d.dealId }, select: { id: true } })
    if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  }

  const issuedAt = d.sendNow ? new Date() : null
  const dueAt = d.dueAt ? new Date(d.dueAt) : (d.sendNow ? defaultDueDate() : null)

  // Retry once on invoiceNumber collision (P2002 unique violation)
  let invoice
  for (let attempt = 0; attempt < 2; attempt++) {
    const invoiceNumber = await nextInvoiceNumber()
    try {
      invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          userId: d.userId,
          dealId: d.dealId ?? null,
          type: d.type,
          amount: d.amount,
          description: d.description,
          status: d.sendNow ? 'SENT' : 'DRAFT',
          issuedAt,
          dueAt,
        },
      })
      break
    } catch (e: any) {
      if (e?.code === 'P2002' && attempt === 0) continue
      throw e
    }
  }

  if (d.sendNow && invoice) {
    try {
      await sendEmail({
        to: customer.email,
        subject: `Invoice ${invoice.invoiceNumber} from Rêve Bâtir — ${INVOICE_TYPE_LABELS[d.type as InvoiceType]}`,
        html: `
          <p>Hello ${customer.investorProfile?.firstName ?? ''},</p>
          <p>Your invoice <strong>${invoice.invoiceNumber}</strong> for <strong>£${d.amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> is ready.</p>
          <p><strong>Description:</strong> ${d.description}</p>
          <p><strong>Due:</strong> ${dueAt ? dueAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p>
          <p><a href="${process.env.NEXTAUTH_URL}/portal/invoices">View & download invoice →</a></p>
          <p style="color:#888;font-size:12px">Payment details on the PDF. Please quote ${invoice.invoiceNumber} on your bank transfer.</p>
        `,
      })
    } catch (e) {
      console.error('Invoice email failed (non-fatal):', e)
    }
  }

  return NextResponse.json({ success: true, invoice })
}
