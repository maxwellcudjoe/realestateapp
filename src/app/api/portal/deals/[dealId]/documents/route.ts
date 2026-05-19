import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadDocument } from '@/lib/azure-blob'
import { VALID_DEAL_DOC_TYPES } from '@/lib/deal-documents'
import { getDealForViewer } from '@/lib/deal-access'
import crypto from 'crypto'

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const MAX_SIZE = 20 * 1024 * 1024 // 20 MB — bigger than KYC because contracts can be large

function loadDeal(dealId: string, userId: string, role: string) {
  return getDealForViewer(dealId, userId, role)
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ dealId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dealId } = await ctx.params
  const deal = await loadDeal(dealId, session.user.id, session.user.role)
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const isAdmin = session.user.role === 'admin'
  const docs = await prisma.dealDocument.findMany({
    where: {
      dealId,
      ...(isAdmin ? {} : { visibility: 'INVESTOR' }),
    },
    orderBy: { uploadedAt: 'desc' },
  })

  return NextResponse.json({
    documents: docs.map((d) => ({
      id: d.id,
      type: d.type,
      fileName: d.fileName,
      visibility: d.visibility,
      uploadedAt: d.uploadedAt.toISOString(),
      uploadedByMe: d.uploadedByUserId === session.user.id,
    })),
  })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ dealId: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dealId } = await ctx.params
  const deal = await loadDeal(dealId, session.user.id, session.user.role)
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null
  const visibility = (formData.get('visibility') as string) ?? 'INVESTOR'

  if (!file || !type || !VALID_DEAL_DOC_TYPES.has(type)) {
    return NextResponse.json({ error: 'Invalid file or document type' }, { status: 400 })
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: 'Allowed types: PDF, JPG, PNG, DOC, DOCX' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: `File must be under ${MAX_SIZE / 1024 / 1024} MB` }, { status: 400 })
  }
  // Only admins can mark a doc ADMIN_ONLY
  const finalVisibility = session.user.role === 'admin' && visibility === 'ADMIN_ONLY' ? 'ADMIN_ONLY' : 'INVESTOR'

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split('.').pop() || 'bin'
  const blobPath = `deal-docs/${dealId}/${type}/${crypto.randomUUID()}.${ext}`
  await uploadDocument(buffer, blobPath, file.type)

  const doc = await prisma.dealDocument.create({
    data: {
      dealId,
      uploadedByUserId: session.user.id,
      type,
      fileName: file.name,
      blobPath,
      visibility: finalVisibility,
    },
  })

  return NextResponse.json({ success: true, id: doc.id, fileName: doc.fileName })
}
