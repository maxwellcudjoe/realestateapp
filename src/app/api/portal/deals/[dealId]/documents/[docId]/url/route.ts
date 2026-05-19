import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generatePresignedUrl, deleteBlob } from '@/lib/azure-blob'
import { getDealForViewer } from '@/lib/deal-access'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ dealId: string; docId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dealId, docId } = await ctx.params

  // Tier-gated deal access (investor) / admin bypass — single source of truth
  const deal = await getDealForViewer(dealId, session.user.id, session.user.role)
  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const doc = await prisma.dealDocument.findUnique({ where: { id: docId } })
  if (!doc || doc.dealId !== dealId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isAdmin = session.user.role === 'admin'
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

  // Tier-gated deal access (investor) / admin bypass
  const deal = await getDealForViewer(dealId, session.user.id, session.user.role)
  if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const doc = await prisma.dealDocument.findUnique({ where: { id: docId } })
  if (!doc || doc.dealId !== dealId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAdmin = session.user.role === 'admin'
  const isUploader = doc.uploadedByUserId === session.user.id

  // Admin can delete anything; investor can only delete their own uploads
  if (!isAdmin && !isUploader) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.dealDocument.delete({ where: { id: docId } })
  // L7 — best-effort blob cleanup so the Azure container doesn't accumulate orphans
  await deleteBlob(doc.blobPath)
  return NextResponse.json({ success: true })
}
