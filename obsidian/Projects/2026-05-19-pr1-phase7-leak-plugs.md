---
title: "PR #1 — Phase 7 leak plugs (C3, C4, C5, C7, H6, H7)"
date: "2026-05-19"
language: "typescript"
status: "complete"
tags: [audit-followup, phase-7, premium-tier, security, race-conditions]
---

# PR #1 — Phase 7 leak plugs

First of three audit-followup PRs. Plugs five concrete security/correctness gaps from the [deal-workflow audit](../Knowledge/2026-05-18-deal-workflow-audit.md) — three of which silently broke the Premium tier revenue feature shipped in Phase 7B.

## Fixes

### C5 — `batch-post` now sets `publishedAt`
`src/app/api/admin/match/batch-post/route.ts:71`. One-line addition. Previously every batch-posted deal had `publishedAt = null`, which `dealVisibilityWhere` treats as "legacy, visible to all" — silently disabling the FREE-tier 48h gate for the platform's primary deal-distribution path.

### C4 — Offer POST requires `DealResponse.intent === 'ACCEPT'`
`src/app/api/portal/deals/[dealId]/offer/route.ts:19,57-63`. Loaded `response` in `getDealForUser`; added an explicit `RESPONSE_REQUIRED` 409 if intent is missing or anything other than ACCEPT. UI already gated OfferForm rendering on this — the API now matches.

### C3 — PoF gate enforced on offer PATCH (not just POST)
`src/app/api/portal/deals/[dealId]/offer/route.ts:121-129`. Same `hasActiveProofOfFunds` check, same 403 + `POF_REQUIRED` code. Prevents the "park £1 offer while PoF fresh, raise to £750k after PoF expires" bypass.

### C7 — Subscription cancellation preserves tier until period ends
`src/app/api/admin/subscriptions/[userId]/route.ts:84-104`. Removed the `User.tier = 'FREE'` write from cancel DELETE — only `Subscription.cancelledAt` is set. Added a 409 guard for already-cancelled subs. Matches the schema comment ("tier remains PREMIUM until nextRenewalAt passes"). Refund/chargeback liability removed.

New helper `effectiveTier(user, now)` in `src/lib/subscriptions.ts:60-83` computes the runtime tier from stored intent + subscription state:
- `tier = 'PREMIUM'` + no subscription cancelled → PREMIUM
- `tier = 'PREMIUM'` + cancelled + still within renewal period → PREMIUM (the C7 fix)
- `tier = 'PREMIUM'` + cancelled + past renewal → FREE
- Anything else → FREE

Updated all tier-gate call sites to use `effectiveTier`:
- `src/app/api/portal/deals/route.ts` (list)
- `src/app/portal/deals/page.tsx` (list)
- `src/app/portal/deals/[dealId]/page.tsx` (detail)
- `src/app/portal/subscription/page.tsx` — also shows "Premium (cancelled — ends [date])" inline.

### H6 — Offer POST race returns friendly 409 (not 500)
`src/app/api/portal/deals/[dealId]/offer/route.ts:76-89`. Wrapped `$transaction` in try/catch; P2002 from `Offer.dealId @unique` now returns 409 with "An offer was already submitted for this deal."

### H7 — Response POST race returns friendly 409 (not 500)
`src/app/api/portal/deals/[dealId]/response/route.ts:57-72`. Same pattern: try/catch around `dealResponse.create`, P2002 → 409.

## Tests

- `tests/api/offer.test.ts` — extended (was 15, now 18):
  - Existing POST tests updated to include `response: { intent: 'ACCEPT' }` in deal mock (required by new gate)
  - New: rejects when response.intent is PASS (C4)
  - New: rejects when no response at all (C4)
  - New: friendly 409 on P2002 race (H6)
  - New PATCH test: rejects when PoF expired (C3)
- `tests/api/response.test.ts` — new (5 tests):
  - Creates response when none exists
  - Rejects unauthenticated
  - 404 for foreign deal
  - In-memory 409 for existing response
  - DB-level P2002 → friendly 409 (H7)
- `tests/api/subscriptions.test.ts` — new (4 tests):
  - Rejects non-admin
  - 404 for missing subscription
  - 409 for already-cancelled subscription
  - **Critical**: cancels WITHOUT calling `prisma.user.update` (C7)
- `tests/lib/subscriptions.test.ts` — extended:
  - New describe block for `effectiveTier`: 6 cases covering FREE/PREMIUM, cancelled-in-period, cancelled-expired, null tier, uncancelled-but-overdue-renewal.

## Verification

- 301/301 tests pass (was 282 → +19 new tests, none broken)
- Production build clean — no new pages, no schema migration

## Out of scope (deferred)

- Subscription POST reactivation behaviour when re-activating a cancelled-in-period sub still wipes `cancelledAt` and resets `nextRenewalAt` — acceptable for v1 but should be tightened in a future pass (treat "undo cancel" vs "fresh period" as distinct flows).
- An admin-triggered or scheduled "demote expired Premiums" job that flips `User.tier` for users whose `effectiveTier` is FREE — currently `effectiveTier()` computes this at read-time, which is correct but means `User.tier` drifts as "intent" rather than "current state". Read-time computation is fine while volume is low.
