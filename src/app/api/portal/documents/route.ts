import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadDocument } from '@/lib/azure-blob'
import crypto from 'crypto'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const VALID_DOC_TYPES = ['PASSPORT', 'DRIVING_LICENCE', 'PROOF_OF_ADDRESS', 'SOURCE_OF_FUNDS']

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
  if (!app || app.status !== 'DOCUMENTS_REQUESTED') {
    return NextResponse.json({ error: 'Document upload not available' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const docType = formData.get('type') as string | null

  if (!file || !docType || !VALID_DOC_TYPES.includes(docType)) {
    return NextResponse.json({ error: 'Invalid file or document type' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only PDF, JPG, and PNG files are accepted' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File must be under 10 MB' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split('.').pop() || 'bin'
  const blobPath = `kyc/${app.id}/${docType}/${crypto.randomUUID()}.${ext}`

  await uploadDocument(buffer, blobPath, file.type)

  // Delete existing doc of same type, then create new one
  await prisma.document.deleteMany({
    where: { applicationId: app.id, type: docType },
  })
  const doc = await prisma.document.create({
    data: {
      applicationId: app.id,
      type: docType,
      fileName: file.name,
      blobPath,
      reviewStatus: 'PENDING',
    },
  })

  return NextResponse.json({ success: true, fileName: doc.fileName })
}
