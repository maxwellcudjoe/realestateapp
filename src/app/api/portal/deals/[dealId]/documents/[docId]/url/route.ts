import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generatePresignedUrl } from '@/lib/azure-blob'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ dealId: string; docId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dealId, docId } = await ctx.params

  const doc = await prisma.dealDocument.findUnique({
    where: { id: docId },
    include: {
      deal: { include: { application: { include: { investorProfile: true } } } },
    },
  })
  if (!doc || doc.dealId !== dealId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isAdmin = session.user.role === 'admin'
  const isOwner = doc.deal.application.investorProfile.userId === session.user.id

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!isAdmin && doc.visibility === 'ADMIN_ONLY') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = await generatePresignedUrl(doc.blobPath)
  return NextResponse.json({ url })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ dealId: string; docId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dealId, docId } = await ctx.params
  const doc = await prisma.dealDocument.findUnique({
    where: { id: docId },
    include: { deal: { include: { application: { include: { investorProfile: true } } } } },
  })
  if (!doc || doc.dealId !== dealId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin = session.user.role === 'admin'
  const isOwner = doc.deal.application.investorProfile.userId === session.user.id
  const isUploader = doc.uploadedByUserId === session.user.id

  // Admin can delete anything; investor can only delete their own uploads
  if (!isAdmin && !(isOwner && isUploader)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.dealDocument.delete({ where: { id: docId } })
  return NextResponse.json({ success: true })
}
