import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sumsubConfigured, getAccessToken, createApplicant } from '@/lib/sumsub'

/** Returns a short-lived SumSub WebSDK access token for the current investor.
 *  Creates the applicant on first call. */
export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!sumsubConfigured()) {
    return NextResponse.json({ error: 'KYC verification not configured', configured: false }, { status: 503 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { investorProfile: true },
  })
  if (!user?.investorProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Ensure the applicant exists
  if (!user.investorProfile.sumsubApplicantId) {
    try {
      const applicant = await createApplicant(user.id, {
        firstName: user.investorProfile.firstName,
        lastName: user.investorProfile.lastName,
        email: user.email,
        dob: user.investorProfile.dateOfBirth ? user.investorProfile.dateOfBirth.toISOString().slice(0, 10) : null,
      })
      await prisma.investorProfile.update({
        where: { id: user.investorProfile.id },
        data: { sumsubApplicantId: applicant.id },
      })
    } catch (e) {
      console.error('[sumsub] createApplicant failed:', e)
      return NextResponse.json({ error: 'Could not initialise verification session' }, { status: 502 })
    }
  }

  try {
    const tok = await getAccessToken(user.id)
    return NextResponse.json({ token: tok.token, userId: tok.userId })
  } catch (e) {
    console.error('[sumsub] getAccessToken failed:', e)
    return NextResponse.json({ error: 'Could not issue verification token' }, { status: 502 })
  }
}
