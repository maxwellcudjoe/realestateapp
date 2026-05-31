import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { getClientIp } from '@/lib/rate-limit'

const Body = z.object({ emailId: z.string().min(1) })

export async function POST(req: NextRequest | Request): Promise<Response> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = Body.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const email = await prisma.emailMessage.findUnique({
    where: { id: parsed.data.emailId },
    select: { id: true },
  })
  if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 404 })

  await prisma.emailMessage.update({
    where: { id: email.id },
    data: { classification: 'MANUAL_DROP' },
  })

  await recordAudit({
    actorUserId: session.user.id ?? null,
    actorRole: 'admin',
    action: 'INBOX_DROP',
    resourceType: 'EmailMessage',
    resourceId: email.id,
    ipAddress: getClientIp(req as Request),
  })

  return NextResponse.json({ ok: true })
}
