import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { getClientIp } from '@/lib/rate-limit'

const Body = z.object({ body: z.string().min(1).max(5000) })

export async function POST(req: NextRequest | Request, ctx: { params: { id: string } }): Promise<Response> {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = ctx.params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = Body.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const lead = await prisma.lead.findUnique({ where: { id }, select: { id: true } })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const note = await prisma.leadNote.create({
    data: { leadId: id, authorUserId: session.user.id, body: parsed.data.body },
  })

  await recordAudit({
    action: 'LEAD_NOTE_ADDED',
    resourceType: 'Lead',
    resourceId: id,
    metadata: { noteId: note.id, length: parsed.data.body.length },
    ipAddress: getClientIp(req as NextRequest),
  })

  return NextResponse.json({ ok: true, note })
}
