import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProfileEditForm, ProfileData } from '@/components/portal/ProfileEditForm'

export const dynamic = 'force-dynamic'

export default async function PortalProfilePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const profile = await prisma.investorProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      structuredAreas: { orderBy: { label: 'asc' } },
      strategies: true,
    },
  })
  if (!profile) {
    return <p className="font-sans text-sm text-stone">No profile found.</p>
  }

  const initial: ProfileData = {
    phone: profile.phone,
    addressLine1: profile.addressLine1,
    city: profile.city,
    postcode: profile.postcode,
    budgetMin: Number(profile.budgetMin),
    budgetMax: Number(profile.budgetMax),
    strategies: profile.strategies.length > 0
      ? profile.strategies.map((s) => s.strategy)
      : [profile.strategy].filter((s) => s !== 'Any' && s !== 'All'),
    buyerType: profile.buyerType,
    targetAreaCodes: profile.structuredAreas.map((a) => a.code),
    experienceLevel: profile.experienceLevel ?? '',
    timelineToBuy: profile.timelineToBuy ?? '',
    mortgageStatus: profile.mortgageStatus ?? 'NONE',
    mortgageLender: profile.mortgageLender ?? '',
    maxLtv: profile.maxLtv ?? undefined,
    depositAvailable: profile.depositAvailable ? Number(profile.depositAvailable) : undefined,
    referralSource: profile.referralSource ?? '',
    taxResidency: profile.taxResidency ?? 'GB',
    niNumber: profile.niNumber ?? '',
    sourceOfFunds: profile.sourceOfFunds ?? '',
    sourceOfFundsDetail: profile.sourceOfFundsDetail ?? '',
    marketingConsent: Boolean(profile.marketingConsentAt),
    locked: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      dateOfBirth: profile.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      nationality: profile.nationality,
      isPep: profile.isPep,
    },
  }

  return (
    <div>
      <h1 className="font-serif text-4xl font-light text-ivory mb-2">Profile</h1>
      <p className="font-sans text-sm text-stone mb-12">
        Keep your investment criteria and contact details current so we send you the right deals.
      </p>
      {!profile.complianceCompleted && (
        <div className="border border-gold bg-gold/5 p-4 mb-8">
          <p className="font-sans text-xs text-gold">
            Some compliance fields are missing on your account. Please complete the form below.
          </p>
        </div>
      )}
      <ProfileEditForm initial={initial} />
    </div>
  )
}
