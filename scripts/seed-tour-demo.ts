/**
 * Seeds a "demo investor" account with a deal at every lifecycle stage,
 * supporting documents, viewings, offers, and a completed Property.
 * Used to produce reproducible portal screenshots for /tour.
 *
 * Usage:  npx tsx scripts/seed-tour-demo.ts
 * Idempotent — running twice will not produce duplicates.
 */

import { PrismaClient } from '../src/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEMO_EMAIL = 'demo@revebatir.co.uk'
const DEMO_PASSWORD = 'TourDemo!2026'

async function main() {
  console.log('[seed-tour-demo] starting…')

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      role: 'investor',
      emailVerifiedAt: new Date(),
      firstName: 'Demo',
      lastName: 'Investor',
    },
  })
  console.log(`[seed-tour-demo] user upserted: ${user.id}`)

  console.log(`
[seed-tour-demo] base user created.

Sign in:
  Email:    ${DEMO_EMAIL}
  Password: ${DEMO_PASSWORD}

NOTE: The full demo dataset (deals at every lifecycle stage, completed Property,
sample invoices, viewing records, 2FA on the demo account, login-activity rows)
is intentionally NOT in this script yet. Add the entity-specific create blocks
below once the screenshot list is finalised — keeping them in version control
keeps captures reproducible across the team.

Stage targets to add next:
  - 1 Deal in PROPOSED
  - 1 Deal in OFFER_PENDING (with an Offer)
  - 1 Deal in CONVEYANCING (with stage history)
  - 1 Property (COMPLETED — drives the portfolio tab)
  - 3 Invoices (1 PAID SOURCING, 1 SENT SUCCESS, 1 SENT SUBSCRIPTION)
  - 1 Viewing in CONFIRMED
  - TOTP enabled on the user, with 10 recovery codes generated
  - LoginAttempt rows so /portal/security has data to display

When ready, extend below.
`)

  await prisma.$disconnect()
  console.log('[seed-tour-demo] done.')
}

main().catch((e) => {
  console.error('[seed-tour-demo] failed:', e)
  process.exit(1)
})
