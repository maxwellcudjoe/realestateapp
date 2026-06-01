import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { convertLead } from '@/lib/leads/convert'
import { checkPasswordBreached } from '@/lib/password'
import { isTokenValid } from '@/lib/leads/token'

const Body = z.object({
  token: z.string().min(1),
  password: z.string().min(12).max(200),
  gdprConsent: z.boolean(),
})

export async function POST(req: Request): Promise<Response> {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const parsed = Body.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  if (!parsed.data.gdprConsent) return NextResponse.json({ error: 'GDPR consent required' }, { status: 400 })

  const breached = await checkPasswordBreached(parsed.data.password)
  if (breached) return NextResponse.json({ error: 'Password has appeared in public breach data — please pick a different one' }, { status: 400 })

  const tokenRow = await prisma.leadConversionToken.findUnique({
    where: { token: parsed.data.token },
    select: { id: true, leadId: true, expiresAt: true, usedAt: true },
  })
  if (!tokenRow) return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  if (!isTokenValid(tokenRow)) return NextResponse.json({ error: 'Token already used or expired' }, { status: 410 })

  const result = await convertLead(tokenRow.leadId, {
    password: parsed.data.password,
    consents: { gdpr: parsed.data.gdprConsent },
  })

  await prisma.leadConversionToken.update({
    where: { id: tokenRow.id },
    data: { usedAt: new Date() },
  })

  return NextResponse.json({ ok: true, userId: result.userId, applicationId: result.applicationId })
}
