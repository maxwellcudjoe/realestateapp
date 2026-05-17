import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    kycCheck: { findFirst: vi.fn(), create: vi.fn() },
    application: { findUnique: vi.fn() },
  },
}))

import { getKycService } from '@/lib/kyc-provider'

describe('getKycService', () => {
  it('returns MANUAL provider when KYC_PROVIDER is unset', () => {
    delete process.env.KYC_PROVIDER
    const svc = getKycService()
    expect(svc.provider).toBe('MANUAL')
  })

  it('initiateCheck returns PENDING for manual provider', async () => {
    const svc = getKycService()
    const result = await svc.initiateCheck({
      applicationId: 'a1', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com',
    })
    expect(result.status).toBe('PENDING')
    expect(result.externalCheckId).toBeNull()
  })

  it('fetchStatus echoes the external id back with PENDING', async () => {
    const svc = getKycService()
    const result = await svc.fetchStatus('ext-123')
    expect(result.externalCheckId).toBe('ext-123')
    expect(result.status).toBe('PENDING')
  })
})
