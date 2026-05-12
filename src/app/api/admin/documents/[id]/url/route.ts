import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generatePresignedUrl } from '@/lib/azure-blob'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
  })

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const url = generatePresignedUrl(doc.blobPath)
  return NextResponse.redirect(url)
}
