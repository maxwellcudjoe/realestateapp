import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { findMatchingInvestors } from '@/lib/match'
import { z } from 'zod'

const querySchema = z.object({
  price: z.number().positive(),
  areaCode: z.string().optional(),
  strategyCode: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = querySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const matches = await findMatchingInvestors(parsed.data)
  return NextResponse.json({ matches, count: matches.length })
}
