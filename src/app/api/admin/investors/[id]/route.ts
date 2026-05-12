import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const app = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      investorProfile: {
        include: { user: { select: { email: true } } },
      },
      documents: { orderBy: { uploadedAt: 'desc' } },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    applicationId: app.id,
    status: app.status,
    adminNotes: app.adminNotes,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    profile: {
      firstName: app.investorProfile.firstName,
      lastName: app.investorProfile.lastName,
      email: app.investorProfile.user.email,
      phone: app.investorProfile.phone,
      addressLine1: app.investorProfile.addressLine1,
      city: app.investorProfile.city,
      postcode: app.investorProfile.postcode,
      budgetMin: Number(app.investorProfile.budgetMin),
      budgetMax: Number(app.investorProfile.budgetMax),
      strategy: app.investorProfile.strategy,
      buyerType: app.investorProfile.buyerType,
      targetAreas: app.investorProfile.targetAreas,
    },
    documents: app.documents.map((d) => ({
      id: d.id,
      type: d.type,
      fileName: d.fileName,
      uploadedAt: d.uploadedAt,
      reviewStatus: d.reviewStatus,
    })),
    history: app.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      note: h.note,
      createdAt: h.createdAt,
    })),
  })
}
