---
title: "PR #2 — Centralised deal access with tier gate (C1, L2)"
date: "2026-05-19"
language: "typescript"
status: "complete"
tags: [audit-followup, phase-7, premium-tier, refactor, security]
---

# PR #2 — Centralised deal access with tier gate

Closes **C1** (subresource APIs ignore the Premium tier gate, making the 48h preview UI-only) and **L2** (5+ portal routes had near-duplicate `getDealForUser` helpers with subtle drift).

## What changed

### New library: `src/lib/deal-access.ts`

Three exported functions, single source of truth for deal-scoped access:

```ts
// Investor flow — scopes by ownership AND enforces FREE-tier 48h preview gate.
// Returns null on any failure (don't leak whether a hidden deal exists).
getInvestorDeal<I>(dealId, userId, options?: { include?: I })

// Admin flow — no tier or ownership constraint.
getAdminDeal<I>(dealId, options?: { include?: I })

// Role-aware shortcut for routes that serve both roles (messages, documents).
getDealForViewer<I>(dealId, userId, role, options?: { include?: I })
```

`getInvestorDeal` internally:
1. Fetches `user.tier` + `subscription` (for `effectiveTier` from PR #1)
2. Computes effective tier (treats cancelled-but-in-period as PREMIUM)
3. Runs `prisma.deal.findFirst` with `AND: [id, ownership-scope, dealVisibilityWhere(tier)]`

Legacy deals (`publishedAt = null`) remain visible to everyone via the existing `dealVisibilityWhere` semantics.

### Routes migrated

All six per-deal portal subresource routes now use the helper:

| Route | Was | Now |
|---|---|---|
| `[dealId]/offer/route.ts` | local `getDealForUser` | `getInvestorDeal` (with `include: {offer, response, application}`) |
| `[dealId]/response/route.ts` | local `getDealForUser` | `getInvestorDeal` (with `include: {response}`) |
| `[dealId]/viewings/route.ts` | local `loadDealForUser(role)` | `getDealForViewer` (admin/investor split) |
| `[dealId]/documents/route.ts` | local `loadDeal(role)` | `getDealForViewer` |
| `[dealId]/documents/[docId]/url/route.ts` | direct doc lookup with manual scope check | `getDealForViewer` first (tier-gates), then doc lookup; preserves admin-only visibility check |
| `[dealId]/messages/route.ts` | local `getDealForUser` + inline admin branch | `getDealForViewer` |
| `[dealId]/favourite/route.ts` | direct `findFirst` (no tier) | `getInvestorDeal` (now tier-gated) |

Net deletion of ~80 lines of duplicated boilerplate.

### Impact

- **C1 closed**: a FREE-tier investor can no longer hit `/api/portal/deals/[id]/offer` (or any subresource) for a deal still in the 48h preview window, even with the dealId on hand. Server returns 404 (deliberate — no info leak about hidden deals).
- **L2 closed**: any future per-deal route uses the same helper, so the gate is uniform by construction.
- **Bonus**: favourite endpoint is now tier-gated too (was previously bypassable).

## Tests

- `tests/lib/deal-access.test.ts` — new (10 tests):
  - `getInvestorDeal`: returns null for missing user, builds correct PREMIUM/FREE visibility filter, treats cancelled-in-period as PREMIUM (C7 follow-through), scopes by `investorProfile.userId`, forwards `include`.
  - `getAdminDeal`: uses `findUnique`, no tier filter, forwards `include`.
  - `getDealForViewer`: routes to admin path when role=admin, investor path otherwise.

- Migrated existing route tests to mock `@/lib/deal-access` instead of `prisma.deal.findFirst/findUnique`:
  - `tests/api/offer.test.ts` (18 tests) — replaced direct prisma mock with helper mock
  - `tests/api/viewing.test.ts` (13 tests) — same
  - `tests/api/response.test.ts` (5 tests) — same
  - `tests/api/deal-messages.test.ts` (6 tests) — same; admin-thread test now asserts the helper was called with role='admin'
  - `tests/api/favourite-interest.test.ts` (10 tests) — same

## Verification

- 311/311 tests pass (was 301 → +10 new deal-access lib tests, none broken in migration)
- Production build clean — TypeScript cast on the generic Prisma return required `as unknown as` per Prisma client's `Prisma__DealClient` thenable shape

## Out of scope

- The admin investor-detail page (`src/app/admin/investors/[id]/page.tsx`) and the admin deal-detail page still use direct `prisma.deal.findUnique` — they're admin-only views, no tier gate needed, but they could call `getAdminDeal` for consistency.
- Page-level tier checks in `src/app/portal/deals/[dealId]/page.tsx` and `src/app/portal/deals/page.tsx` weren't migrated — they intentionally do their own user lookup for the upgrade-banner count. Could be unified later.
