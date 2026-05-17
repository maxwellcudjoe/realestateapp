import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadDocument } from '@/lib/azure-blob'
import { VALID_PROPERTY_DOC_TYPES } from '@/lib/property-docs'
import crypto from 'crypto'

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const MAX_SIZE = 20 * 1024 * 1024

async function loadOwned(propertyId: string, userId: string) {
  return prisma.property.findFirst({ where: { id: propertyId, userId }, select: { id: true } })
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ propertyId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { propertyId } = await ctx.params
  const owned = await loadOwned(propertyId, session.user.id)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const docs = await prisma.propertyDocument.findMany({
    where: { propertyId },
    orderBy: { uploadedAt: 'desc' },
  })
  return NextResponse.json({
    documents: docs.map((d) => ({
      id: d.id,
      type: d.type,
      fileName: d.fileName,
      expiresAt: d.expiresAt?.toISOString() ?? null,
      uploadedAt: d.uploadedAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ propertyId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { propertyId } = await ctx.params
  const owned = await loadOwned(propertyId, session.user.id)
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null
  const expiresAtRaw = (formData.get('expiresAt') as string) ?? ''

  if (!file || !type || !VALID_PROPERTY_DOC_TYPES.has(type)) {
    return NextResponse.json({ error: 'Invalid file or document type' }, { status: 400 })
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: 'Allowed types: PDF, JPG, PNG, DOC, DOCX' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: `File must be under ${MAX_SIZE / 1024 / 1024} MB` }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split('.').pop() || 'bin'
  const blobPath = `property-docs/${propertyId}/${type}/${crypto.randomUUID()}.${ext}`
  await uploadDocument(buffer, blobPath, file.type)

  const doc = await prisma.propertyDocument.create({
    data: {
      propertyId,
      uploadedByUserId: session.user.id,
      type,
      fileName: file.name,
      blobPath,
      expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
    },
  })
  return NextResponse.json({ success: true, id: doc.id })
}
