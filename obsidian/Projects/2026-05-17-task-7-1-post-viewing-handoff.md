---
title: "Task 7.1 — Post-viewing handoff"
date: "2026-05-17"
language: "typescript"
status: "complete"
tags: [phase-7, viewings, deals, ux]
---

# Task 7.1 — Post-viewing handoff

Closes the dead-zone between viewing CONFIRMED and offer submission.

## What changed

- **`src/components/portal/ViewingPanel.tsx`** — added `AdminCompleteOrCancel` sub-component that renders when `isAdmin && v.status === 'CONFIRMED'`. Admin can now click "Mark as completed" or "Cancel viewing" (the latter with a `confirm()` prompt) directly from the panel. Both call `PATCH /api/admin/viewings/[viewingId]` (existing route — already supports COMPLETED/CANCELLED without requiring `confirmedSlot`).
- **`src/components/portal/PostViewingPrompt.tsx`** — new client component. Renders a gold-bordered banner: "You viewed {address} on {date}. Ready to make your formal offer?" with a "Make offer ↓" button that smooth-scrolls to `#offer-section` and a dismiss button.
- **`src/app/portal/deals/[dealId]/page.tsx`** — query now includes `viewings`; computes a `recentViewing` (status=COMPLETED, or CONFIRMED with `confirmedSlot < now`); shows `PostViewingPrompt` when (a) recentViewing exists AND (b) `deal.response?.intent === 'ACCEPT'` AND (c) no `deal.offer` yet. Added `id="offer-section"` to the OfferForm section for the smooth-scroll target.
- **`tests/api/viewing.test.ts`** — 8 tests covering admin PATCH (auth, role gate, invalid enum, 404, CONFIRMED-requires-slot, COMPLETED without slot, CANCELLED + notification, REQUESTED → CONFIRMED).

## Scope reduction discovered mid-task

The original plan also called for an admin "New offer received — move to OFFER_PENDING?" banner. After reading `src/app/api/portal/deals/[dealId]/offer/route.ts:68-74` I found this is **already implemented** — the offer POST transaction includes:

```ts
...(deal.stage === 'PROPOSED' ? [
  prisma.deal.update({ where: { id: dealId }, data: { stage: 'OFFER_PENDING' } }),
  prisma.dealStageHistory.create({ ... }),
] : []),
```

So the stage auto-advances without admin intervention. The manual banner would have been redundant. Updated Phase 7 plan accordingly.

## Verification

- 229/229 tests pass
- Production build clean — no new pages affected sizes beyond +0.13kB on `/portal/deals/[dealId]`
- No schema changes — pure UI + read-side
