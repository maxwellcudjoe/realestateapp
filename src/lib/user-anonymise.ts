import type { PrismaClient } from '@/generated/prisma/client'

/**
 * Anonymise a user's personal data without deleting their User/InvestorProfile/
 * Application rows. UK MLR 2017 requires 7-year retention on regulated activity,
 * so we soft-delete + scrub PII rather than hard-delete.
 *
 * Idempotent: safe to re-run on an already-anonymised user (the email rewrite
 * uses a stable suffix derived from the user id, and stale tokens are deleted
 * with deleteMany).
 *
 * Sets `anonymisedAt` so the day-30 cron knows not to re-process.
 */
export async function anonymiseUser(prisma: PrismaClient, userId: string, now: Date = new Date()): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { investorProfile: true },
  })
  if (!user) return

  const anonStamp = `[deleted-${user.id.slice(0, 8)}]`

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        deletedAt: user.deletedAt ?? now,
        anonymisedAt: now,
        email: `${anonStamp}@deleted.local`,
        passwordHash: 'DELETED',
        totpSecret: null,
        totpEnabledAt: null,
      },
    })

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

    await tx.passwordResetToken.deleteMany({ where: { userId: user.id } })
    await tx.emailVerificationToken.deleteMany({ where: { userId: user.id } })
    await tx.recoveryCode.deleteMany({ where: { userId: user.id } })
  })
}

/**
 * Find users whose grace period has expired: deletedAt is older than `graceDays`
 * AND anonymisedAt is still null.
 */
export async function findExpiredSoftDeletes(
  prisma: PrismaClient,
  graceDays: number,
  now: Date = new Date(),
): Promise<{ id: string; email: string; deletedAt: Date | null }[]> {
  const cutoff = new Date(now.getTime() - graceDays * 24 * 60 * 60 * 1000)
  return prisma.user.findMany({
    where: {
      deletedAt: { lt: cutoff },
      anonymisedAt: null,
    },
    select: { id: true, email: true, deletedAt: true },
    take: 500,
  })
}
