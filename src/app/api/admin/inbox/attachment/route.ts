import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generatePresignedUrl } from '@/lib/azure-blob'

const ALLOWED_PREFIX = 'dealer-correspondence/'

export async function GET(req: Request): Promise<Response> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const path = url.searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  // Defence-in-depth: only allow paths inside the dealer-correspondence container
  if (!path.startsWith(ALLOWED_PREFIX) || path.includes('..')) {
    return NextResponse.json({ error: 'forbidden path' }, { status: 403 })
  }

  const sas = generatePresignedUrl(path)
  return NextResponse.redirect(sas, 302)
}
