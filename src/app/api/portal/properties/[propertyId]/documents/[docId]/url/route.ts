import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generatePresignedUrl, deleteBlob } from '@/lib/azure-blob'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ propertyId: string; docId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { propertyId, docId } = await ctx.params
  const doc = await prisma.propertyDocument.findUnique({
    where: { id: docId },
    include: { property: true },
  })
  if (!doc || doc.propertyId !== propertyId || doc.property.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const url = await generatePresignedUrl(doc.blobPath)
  return NextResponse.json({ url })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ propertyId: string; docId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { propertyId, docId } = await ctx.params
  const doc = await prisma.propertyDocument.findUnique({
    where: { id: docId },
    include: { property: true },
  })
  if (!doc || doc.propertyId !== propertyId || doc.property.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await prisma.propertyDocument.delete({ where: { id: docId } })
  // L7 — best-effort blob cleanup
  await deleteBlob(doc.blobPath)
  return NextResponse.json({ success: true })
}
