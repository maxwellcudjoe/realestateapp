import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'

/** UK GDPR Article 20 — right to data portability. Returns all data tied to the
 *  user as a machine-readable JSON download. Excludes secrets (passwordHash, totpSecret). */
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      investorProfile: {
        include: {
          application: {
            include: {
              documents: true,
              statusHistory: true,
              messages: true,
              deals: { include: { response: true } },
            },
          },
          structuredAreas: true,
          strategies: true,
        },
      },
      loginAttempts: { orderBy: { createdAt: 'desc' }, take: 100 },
    },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const profile = user.investorProfile
  const app = profile?.application

  const data = {
    exportedAt: new Date().toISOString(),
    note: 'This export contains every personal record tied to your account. It does not include credentials or 2FA secrets.',
    account: {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
      twoFactorEnabledAt: user.totpEnabledAt,
      createdAt: user.createdAt,
    },
    profile: profile && {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      addressLine1: profile.addressLine1,
      city: profile.city,
      postcode: profile.postcode,
      dateOfBirth: profile.dateOfBirth,
      nationality: profile.nationality,
      taxResidency: profile.taxResidency,
      niNumber: profile.niNumber,
      isPep: profile.isPep,
      pepDetails: profile.pepDetails,
      sourceOfFunds: profile.sourceOfFunds,
      sourceOfFundsDetail: profile.sourceOfFundsDetail,
      budgetMin: profile.budgetMin,
      budgetMax: profile.budgetMax,
      strategies: profile.strategies.map((s) => s.strategy),
      buyerType: profile.buyerType,
      targetAreas: profile.structuredAreas.map((a) => ({ code: a.code, label: a.label })),
      experienceLevel: profile.experienceLevel,
      timelineToBuy: profile.timelineToBuy,
      mortgageStatus: profile.mortgageStatus,
      mortgageLender: profile.mortgageLender,
      maxLtv: profile.maxLtv,
      depositAvailable: profile.depositAvailable,
      referralSource: profile.referralSource,
      entityType: profile.entityType,
      companyName: profile.companyName,
      companyNumber: profile.companyNumber,
      vatNumber: profile.vatNumber,
      marketingConsentAt: profile.marketingConsentAt,
    },
    application: app && {
      id: app.id,
      status: app.status,
      createdAt: app.createdAt,
      statusHistory: app.statusHistory,
      documents: app.documents.map((d) => ({
        id: d.id, type: d.type, fileName: d.fileName, uploadedAt: d.uploadedAt, reviewStatus: d.reviewStatus,
      })),
      messages: app.messages,
      deals: app.deals,
    },
    recentLoginAttempts: user.loginAttempts.map((a) => ({
      ipAddress: a.ipAddress, success: a.success, reason: a.reason, createdAt: a.createdAt,
    })),
  }

  await recordAudit({
    actorUserId: user.id,
    actorRole: user.role,
    action: 'DATA_EXPORTED',
    resourceType: 'User',
    resourceId: user.id,
  })

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="revebatir-data-export-${user.id}.json"`,
    },
  })
}
