import { NextRequest, NextResponse } from 'next/server'
import { auth, signOut } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { getClientIp } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  password: z.string().min(1),
  confirm: z.literal('DELETE'),
})

/**
 * UK GDPR Article 17 — right to erasure (soft-delete model).
 *
 * Anonymises personal data on the profile, marks User.deletedAt, blocks sign-in.
 * Keeps Application + StatusHistory + Document rows (anonymised owner) because UK
 * MLR 2017 requires 7-year record retention on regulated activity. After 7 years
 * an admin process should hard-delete remaining rows.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Type DELETE in the confirmation field and provide your password.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { investorProfile: true },
  })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'admin') {
    return NextResponse.json({ error: 'Admin accounts cannot be self-deleted. Contact support.' }, { status: 403 })
  }

  if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: 'Password did not match.' }, { status: 400 })
  }

  const now = new Date()
  const anonStamp = `[deleted-${user.id.slice(0, 8)}]`

  await prisma.$transaction(async (tx) => {
    // Anonymise the User record (keep id, mark deletedAt, scramble email/credentials)
    await tx.user.update({
      where: { id: user.id },
      data: {
        deletedAt: now,
        email: `${anonStamp}@deleted.local`,
        passwordHash: 'DELETED',
        totpSecret: null,
        totpEnabledAt: null,
      },
    })

    // Anonymise the InvestorProfile (keep id, scrub PII)
    if (user.investorProfile) {
      await tx.investorProfile.update({
        where: { id: user.investorProfile.id },
        data: {
          firstName: '[Deleted',
          lastName: 'Investor]',
          phone: '',
          addressLine1: '',
          city: '',
          postcode: '',
          niNumber: null,
          pepDetails: null,
          sourceOfFundsDetail: null,
          companyName: null,
          companyNumber: null,
          vatNumber: null,
          companyAddress: null,
          referralSource: null,
          marketingConsentAt: null,
        },
      })
    }

    // Clear active sensitive tokens
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id } })
    await tx.emailVerificationToken.deleteMany({ where: { userId: user.id } })
    await tx.recoveryCode.deleteMany({ where: { userId: user.id } })
  })

  await recordAudit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'ACCOUNT_DELETED',
    resourceType: 'User',
    resourceId: user.id,
    ipAddress: getClientIp(req),
  })

  // Sign the user out — non-fatal
  try { await signOut({ redirect: false }) } catch { /* ignore */ }

  return NextResponse.json({ success: true })
}
