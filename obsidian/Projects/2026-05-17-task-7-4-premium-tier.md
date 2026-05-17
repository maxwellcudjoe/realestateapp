---
title: "Task 7.4 — Premium subscription + 48h deal preview"
date: "2026-05-17"
language: "typescript"
status: "complete"
tags: [phase-7, subscriptions, premium, tier, revenue]
---

# Task 7.4 — Premium subscription tier + 48h deal preview gate

Two-tier model (FREE / PREMIUM) with manual admin activation, monthly or annual billing, and a 48-hour head start on new deals as the primary Premium benefit.

## Schema

```prisma
// User additions
tier            String        @default("FREE") @db.NVarChar(20)
subscription    Subscription?

model Subscription {
  id              String    @id @default(cuid())
  userId          String    @unique
  billingPeriod   String    @default("MONTHLY") @db.NVarChar(20)   // MONTHLY | ANNUAL
  amount          Decimal   @db.Decimal(10, 2)
  startedAt       DateTime
  cancelledAt     DateTime?
  nextRenewalAt   DateTime
  @@index([nextRenewalAt])
}

// Deal additions
publishedAt    DateTime?     // null for legacy deals = visible to all
```

Pushed to Azure SQL in the same `prisma db push` as Task 7.3.

## Files

### Libraries
- `src/lib/subscriptions.ts` — `BILLING_PERIODS`, `USER_TIERS`, `PREMIUM_PREVIEW_HOURS = 48`, env-driven `premiumMonthlyAmount()` / `premiumAnnualAmount()` / `defaultAmountFor(period)`, `nextRenewalDate(from, period)`, `freeTierDealCutoff(now)`, labels.
- `src/lib/deal-visibility.ts` — `dealVisibilityWhere(tier, now)` returns a Prisma `where` fragment with `OR: [{publishedAt: null}, {publishedAt: {lte: ...}}]` (cutoff is `now` for PREMIUM, `now - 48h` for FREE). `isDealVisible(publishedAt, tier, now)` returns boolean for individual checks. Legacy deals (publishedAt null) visible to all tiers.

### API
- `POST /api/admin/subscriptions/[userId]` — activate (or replace) Premium for a user; sets `User.tier=PREMIUM`, creates Subscription row with billingPeriod + amount + nextRenewalAt, sends welcome email.
- `DELETE /api/admin/subscriptions/[userId]` — cancel; sets `User.tier=FREE` + Subscription.cancelledAt = now.
- `POST /api/admin/subscriptions/generate-renewals?days=7` — manual button: finds active (non-cancelled) subscriptions with `nextRenewalAt` within next N days, creates SENT SUBSCRIPTION invoices for each, advances `nextRenewalAt` by one billing period, sends email per invoice. Idempotent: skips users with a SENT/PAID subscription invoice issued in the last 25 days.

### Visibility wiring
- `POST /api/admin/investors/[id]/deals` — sets `publishedAt = new Date()` on every new deal.
- `GET /api/portal/deals` — queries user tier from DB, applies `dealVisibilityWhere(tier)` to deal list.
- `/portal/deals` (page) — same tier-aware filter + counts hidden Premium-only previews; shows a gold banner "X new deals available now to Premium members — you'll see them within 48 hours [Upgrade for instant access →]" for FREE users.
- `/portal/deals/[dealId]` (page) — calls `isDealVisible()` on the deal's publishedAt and redirects FREE users back to the list if the deal is still in the 48h window. Premium bypasses.

### UI
- `/portal/subscription` (investor) — tier card (Free or Premium with billing + next renewal), Upgrade section for FREE showing both Monthly/Annual pricing with savings calc, "contact us via Messages" upgrade flow (no payment processor).
- `SubscriptionPanel` (admin client component) — embedded on `/admin/investors/[id]`. Shows current tier chip + subscription details, "Activate Premium" form (period toggle + amount + Activate button), "Change plan" + "Cancel subscription" actions for active subs.
- `Subscription` tab added to portal nav layout (between Invoices and Messages).

### Email
- Premium activation: subject "Welcome to Rêve Bâtir Premium", body explains 48h head start + billing + next renewal + link to /portal/subscription.
- Renewal invoice: subject "Renewal invoice — Rêve Bâtir Premium {number}", body with amount + due date + link.

### Env vars

```
REVE_BATIR_PREMIUM_MONTHLY=49        # default monthly price
REVE_BATIR_PREMIUM_ANNUAL=499        # default annual price
```

Defaults fall through cleanly (49 / 499) — feature works without env config.

## Tests

- `tests/lib/subscriptions.test.ts` (15) — billing period + tier constants, PREMIUM_PREVIEW_HOURS, premiumMonthly/Annual amounts with env override + fallback + garbage handling, defaultAmountFor, nextRenewalDate (MONTHLY adds 1 month / ANNUAL adds 1 year), freeTierDealCutoff (48h subtract).
- `tests/lib/deal-visibility.test.ts` (8) — dealVisibilityWhere shape for both tiers, isDealVisible (legacy null visible to all, PREMIUM sees fresh, FREE blocked at 2h / unblocked at 49h / boundary-equal at 48h, future-dated blocked for both).

## Design notes

- **Manual upgrade flow**: no Stripe / GoCardless per locked product decision. Investor expresses interest via Messages → admin runs bank transfer with them → admin clicks "Activate Premium" on their investor page → tier flips and subscription row created. Renewal invoices are also bank-transfer based (admin runs the "Generate renewals" job manually weekly-ish — no cron because SWA doesn't have Functions cron set up).
- **48h gate semantics**: the redirect-back-to-list approach (vs 404) is intentional — combined with the upgrade banner on the list page, FREE users have clear context for why they're seeing the redirect ("X premium deals exist, upgrade to see them now").
- **Email-vs-portal mismatch known**: deal-posted emails still go to all investors immediately. A FREE-tier investor will get an email about a new deal that they can't open for 48h. Polish for later: either delay the email or note "available from {date}" in the body for FREE users.
- **Session tier**: not propagated through NextAuth session yet — each gated query reads `User.tier` from DB. Minor extra hop, but keeps auth.config + types simple and immediately reflects upgrades/downgrades without re-login.
- **Out of scope, deferred**: admin-matching premium chip + priority sort (planned in original 7.4 but skipped — current matching surface is `/admin/match` which doesn't yet display tier; can be added once it does).
