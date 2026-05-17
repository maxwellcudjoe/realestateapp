import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderInvoicePdf } from '@/lib/pdf-invoice'
import type { InvoiceType } from '@/lib/invoices'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: session.user.id, status: { in: ['SENT', 'PAID'] } },
    include: {
      user: { include: { investorProfile: true } },
      deal: { select: { address: true } },
    },
  })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const profile = invoice.user.investorProfile
  const customerName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : invoice.user.email

  const buffer = await renderInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    type: invoice.type as InvoiceType,
    amount: Number(invoice.amount),
    description: invoice.description,
    issuedAt: invoice.issuedAt ?? invoice.createdAt,
    dueAt: invoice.dueAt ?? invoice.createdAt,
    customer: {
      name: customerName,
      email: invoice.user.email,
      addressLine1: profile?.addressLine1 ?? null,
      city: profile?.city ?? null,
      postcode: profile?.postcode ?? null,
      companyName: profile?.companyName ?? null,
    },
    dealAddress: invoice.deal?.address ?? null,
  })

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.pdf"`,
      'Cache-Control': 'private, max-age=60',
    },
  })
}
