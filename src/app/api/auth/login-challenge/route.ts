import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { isIpLockedOut } from '@/lib/login-tracking'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const LOGIN_CHALLENGE_RATE = { limit: 10, windowMs: 15 * 60 * 1000 }

/**
 * Stateless probe to determine whether the next step in sign-in is a TOTP code.
 * Does NOT create a session — the actual sign-in still goes through NextAuth.
 * Wrong credentials return needsTotp:false so we never reveal account state.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = checkRateLimit({ key: `login-challenge:${ip}`, ...LOGIN_CHALLENGE_RATE })
  if (!rl.ok) {
    return NextResponse.json({ needsTotp: false }, { status: 429 })
  }
  if (await isIpLockedOut(ip)) {
    return NextResponse.json({ needsTotp: false })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ needsTotp: false }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ needsTotp: false })

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase().trim() } })
  if (!user) return NextResponse.json({ needsTotp: false })

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!ok) return NextResponse.json({ needsTotp: false })

  return NextResponse.json({ needsTotp: Boolean(user.totpEnabledAt) })
}
