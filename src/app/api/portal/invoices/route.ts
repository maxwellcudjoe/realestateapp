import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const invoices = await prisma.invoice.findMany({
    where: { userId: session.user.id, status: { in: ['SENT', 'PAID'] } },
    orderBy: { createdAt: 'desc' },
    include: { deal: { select: { address: true } } },
  })

  return NextResponse.json({
    invoices: invoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      type: i.type,
      amount: Number(i.amount),
      description: i.description,
      status: i.status,
      issuedAt: i.issuedAt?.toISOString() ?? null,
      dueAt: i.dueAt?.toISOString() ?? null,
      paidAt: i.paidAt?.toISOString() ?? null,
      dealAddress: i.deal?.address ?? null,
    })),
  })
}
