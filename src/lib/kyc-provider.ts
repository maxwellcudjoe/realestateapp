/**
 * KYC provider abstraction (Task 6.1).
 *
 * Today's implementation is MANUAL — admins eyeball uploaded documents in the
 * /admin/investors/[id] page. This module defines the interface every future
 * provider (Onfido, SumSub, ComplyAdvantage) plugs into.
 *
 * To wire a real provider:
 *   1. Set KYC_PROVIDER=onfido in env
 *   2. Set ONFIDO_API_TOKEN
 *   3. Add an OnfidoService implementation
 *   4. Update getKycService() to return it when the env var is set
 *
 * Graceful fallback: if no provider is configured, all calls return a stub
 * "manual review" record so the rest of the app keeps working unchanged.
 */

import { prisma } from '@/lib/prisma'

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

let cached: KycService | null = null

export function getKycService(): KycService {
  if (cached) return cached
  const providerName = (process.env.KYC_PROVIDER ?? 'MANUAL').toUpperCase()
  switch (providerName) {
    // Future: case 'ONFIDO': cached = new OnfidoService(); break
    default:
      cached = new ManualKycService()
  }
  return cached
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
