import { prisma } from '@/lib/prisma'

export const POF_FRESHNESS_MONTHS = 6
export const POF_DOC_TYPE = 'PROOF_OF_FUNDS'

/**
 * Returns true when the application has a PROOF_OF_FUNDS document uploaded
 * within the last POF_FRESHNESS_MONTHS. A fresh PoF is required before an
 * investor can request a viewing or submit a formal offer.
 *
 * Note: this is distinct from the SOURCE_OF_FUNDS doc captured at KYC. PoF is
 * a transaction-time evidence of liquidity (recent bank statement, mortgage
 * AIP) and goes stale, whereas SOURCE_OF_FUNDS is a one-time provenance check.
 */
export async function hasActiveProofOfFunds(applicationId: string): Promise<boolean> {
  const cutoff = pofCutoffDate()
  const doc = await prisma.document.findFirst({
    where: { applicationId, type: POF_DOC_TYPE, uploadedAt: { gte: cutoff } },
    select: { id: true },
  })
  return Boolean(doc)
}

export async function getMostRecentProofOfFunds(applicationId: string) {
  return prisma.document.findFirst({
    where: { applicationId, type: POF_DOC_TYPE },
    orderBy: { uploadedAt: 'desc' },
    select: { id: true, fileName: true, uploadedAt: true },
  })
}

export function pofCutoffDate(now: Date = new Date()): Date {
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - POF_FRESHNESS_MONTHS)
  return cutoff
}

export function isPofFresh(uploadedAt: Date, now: Date = new Date()): boolean {
  return uploadedAt >= pofCutoffDate(now)
}
