import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      investorProfile: {
        include: {
          application: {
            include: {
              statusHistory: { orderBy: { createdAt: 'asc' } },
              documents: true,
            },
          },
        },
      },
    },
  })

  if (!user?.investorProfile?.application) {
    return NextResponse.json({ error: 'No application found' }, { status: 404 })
  }

  const app = user.investorProfile.application
  return NextResponse.json({
    applicationId: app.id,
    status: app.status,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    history: app.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      note: h.note,
      createdAt: h.createdAt,
    })),
    documents: app.documents.map((d) => ({
      id: d.id,
      type: d.type,
      fileName: d.fileName,
      uploadedAt: d.uploadedAt,
      reviewStatus: d.reviewStatus,
    })),
  })
}
