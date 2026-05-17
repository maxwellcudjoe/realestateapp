/**
 * KYC provider abstraction (Task 6.1).
 *
 * Supports MANUAL (default) and SUMSUB (production-ready) out of the box.
 *
 * To activate SumSub:
 *   1. Set KYC_PROVIDER=SUMSUB in Azure SWA env
 *   2. Set SUMSUB_APP_TOKEN + SUMSUB_SECRET_KEY (sandbox tokens start with sbx:)
 *   3. Optional: SUMSUB_LEVEL_NAME (verification level slug; default "basic-kyc-level")
 *   4. Optional: SUMSUB_WEBHOOK_SECRET + configure webhook to /api/webhooks/sumsub
 *
 * Graceful fallback: if KYC_PROVIDER=SUMSUB but credentials are missing,
 * falls back to MANUAL with a console warning. The app keeps working.
 */

import { prisma } from '@/lib/prisma'
import { createApplicant, getApplicantStatus, mapSumSubStatus, sumsubConfigured } from '@/lib/sumsub'

export type KycStatus = 'PENDING' | 'CLEAR' | 'CONSIDER' | 'REJECTED' | 'EXPIRED'

export interface InitiateCheckInput {
  applicationId: string
  firstName: string
  lastName: string
  email: string
  dateOfBirth?: Date | null
  nationality?: string | null
}

export interface KycCheckResult {
  externalCheckId: string | null
  status: KycStatus
  reportPdfUrl?: string | null
  rawResult?: unknown
}

export interface KycService {
  readonly provider: string
  /** Kick off a new check. Returns the externalCheckId for polling. */
  initiateCheck(input: InitiateCheckInput): Promise<KycCheckResult>
  /** Fetch the latest status from the provider. */
  fetchStatus(externalCheckId: string): Promise<KycCheckResult>
}

class ManualKycService implements KycService {
  readonly provider = 'MANUAL'

  async initiateCheck(input: InitiateCheckInput): Promise<KycCheckResult> {
    return { externalCheckId: null, status: 'PENDING', rawResult: { note: 'Manual review', appId: input.applicationId } }
  }

  async fetchStatus(externalCheckId: string): Promise<KycCheckResult> {
    return { externalCheckId, status: 'PENDING' }
  }
}

class SumSubKycService implements KycService {
  readonly provider = 'SUMSUB'

  async initiateCheck(input: InitiateCheckInput): Promise<KycCheckResult> {
    const profile = await prisma.investorProfile.findFirst({
      where: { application: { id: input.applicationId } },
      select: { id: true, sumsubApplicantId: true, userId: true },
    })
    if (!profile) throw new Error('Investor profile not found for application')

    // Reuse an existing applicant if one is already tied to this profile
    if (profile.sumsubApplicantId) {
      return { externalCheckId: profile.sumsubApplicantId, status: 'PENDING' }
    }

    const dob = input.dateOfBirth ? input.dateOfBirth.toISOString().slice(0, 10) : null
    const applicant = await createApplicant(profile.userId, {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      dob,
    })

    await prisma.investorProfile.update({
      where: { id: profile.id },
      data: { sumsubApplicantId: applicant.id },
    })

    return { externalCheckId: applicant.id, status: 'PENDING', rawResult: applicant }
  }

  async fetchStatus(externalCheckId: string): Promise<KycCheckResult> {
    const status = await getApplicantStatus(externalCheckId)
    return {
      externalCheckId,
      status: mapSumSubStatus(status),
      rawResult: status,
    }
  }
}

let cached: KycService | null = null

export function getKycService(): KycService {
  if (cached) return cached
  const providerName = (process.env.KYC_PROVIDER ?? 'MANUAL').toUpperCase()
  switch (providerName) {
    case 'SUMSUB':
      if (sumsubConfigured()) {
        cached = new SumSubKycService()
        break
      }
      console.warn('[kyc] KYC_PROVIDER=SUMSUB but credentials missing — falling back to MANUAL')
      cached = new ManualKycService()
      break
    default:
      cached = new ManualKycService()
  }
  return cached
}

/** Test-only: reset the cached service so env changes take effect. */
export function _resetKycServiceCache() {
  cached = null
}

/** Convenience: start a check + persist a KycCheck row. Idempotent — if an in-progress
 *  check already exists for this application, returns it. */
export async function startKycCheckForApplication(applicationId: string): Promise<{ checkId: string; status: KycStatus }> {
  const existing = await prisma.kycCheck.findFirst({
    where: { applicationId, status: { in: ['PENDING', 'CONSIDER'] } },
    orderBy: { startedAt: 'desc' },
  })
  if (existing) return { checkId: existing.id, status: existing.status as KycStatus }

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { investorProfile: { include: { user: { select: { email: true } } } } },
  })
  if (!app) throw new Error('Application not found')

  const service = getKycService()
  const result = await service.initiateCheck({
    applicationId,
    firstName: app.investorProfile.firstName,
    lastName: app.investorProfile.lastName,
    email: app.investorProfile.user.email,
    dateOfBirth: app.investorProfile.dateOfBirth,
    nationality: app.investorProfile.nationality,
  })

  const row = await prisma.kycCheck.create({
    data: {
      applicationId,
      provider: service.provider,
      externalCheckId: result.externalCheckId,
      status: result.status,
      reportPdfUrl: result.reportPdfUrl ?? null,
      rawResult: result.rawResult ? JSON.stringify(result.rawResult) : null,
    },
  })
  return { checkId: row.id, status: row.status as KycStatus }
}
