import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateTotpSecret, totpQrDataUrl } from '@/lib/totp'

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.totpEnabledAt) {
    return NextResponse.json({ error: '2FA is already enabled. Disable it before enrolling again.' }, { status: 400 })
  }

  // Store the pending secret on the user; not "enabled" until confirm step.
  const secret = generateTotpSecret()
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret, totpEnabledAt: null },
  })

  const qrDataUrl = await totpQrDataUrl(user.email, secret)
  return NextResponse.json({ secret, qrDataUrl })
}
