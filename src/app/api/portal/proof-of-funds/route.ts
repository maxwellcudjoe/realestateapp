import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadDocument } from '@/lib/azure-blob'
import { POF_DOC_TYPE } from '@/lib/proof-of-funds'
import crypto from 'crypto'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

/**
 * POST /api/portal/proof-of-funds
 *
 * Upload a fresh proof-of-funds document. Works regardless of application status
 * because PoF is needed at viewing/offer time, which often happens long after
 * the initial KYC was approved. Replaces any existing PoF document for the
 * application (we only care about the most recent one).
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { investorProfile: { include: { application: true } } },
  })

  const app = user?.investorProfile?.application
  if (!app) {
    return NextResponse.json({ error: 'No active investor application' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only PDF, JPG, and PNG files are accepted' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File must be under 10 MB' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split('.').pop() || 'bin'
  const blobPath = `pof/${app.id}/${crypto.randomUUID()}.${ext}`

  await uploadDocument(buffer, blobPath, file.type)

  // Replace existing PoF — only the most recent matters for the gate
  await prisma.document.deleteMany({
    where: { applicationId: app.id, type: POF_DOC_TYPE },
  })
  const doc = await prisma.document.create({
    data: {
      applicationId: app.id,
      type: POF_DOC_TYPE,
      fileName: file.name,
      blobPath,
      reviewStatus: 'PENDING',
    },
  })

  return NextResponse.json({ success: true, fileName: doc.fileName, uploadedAt: doc.uploadedAt.toISOString() })
}
