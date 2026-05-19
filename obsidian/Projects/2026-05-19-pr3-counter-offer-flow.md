---
title: "PR #3 — Counter-offer flow after vendor REJECTED (C8)"
date: "2026-05-19"
language: "typescript"
status: "complete"
tags: [audit-followup, deal-workflow, ux, state-machine]
---

# PR #3 — Counter-offer flow

Closes **C8**: the previous behavior auto-jumped the deal to `FALLEN_THROUGH` (terminal) on vendor REJECTED, locking the investor out of submitting a revised offer. UK property negotiations routinely involve a vendor decline followed by a counter — the platform needs to support it.

## What changed

### Backend — offer-decision

`src/app/api/admin/deals/[dealId]/offer-decision/route.ts`:
- `nextStage` for REJECTED is now `PROPOSED` (was `FALLEN_THROUGH`). Admin can still move to FALLEN_THROUGH via the stage PATCH if the deal is genuinely dead.
- History note for REJECTED now reads "Vendor declined the offer — investor may submit a revised offer".
- Investor notification title: "Offer declined — submit a revised offer if you wish to continue".
- Email body for REJECTED gets an extra paragraph: "You can submit a **revised offer** from your deal page if you'd like to continue the conversation."

### Backend — offer POST (replacement flow)

`src/app/api/portal/deals/[dealId]/offer/route.ts`:
- New status-aware branching in POST:
  - `offer.status === 'PENDING'` → 409 ("use PATCH")
  - `offer.status === 'ACCEPTED'` → 409 ("no revisions allowed")
  - `offer.status IN ('REJECTED', 'WITHDRAWN')` → **replace**: archive (delete) prior + create new in a single `$transaction`
  - No prior offer → create as before
- Schema unchanged. The `Offer.dealId @unique` constraint is preserved by deleting the prior row in the same transaction.
- Audit trail preserved via DealStageHistory note: `"Investor submitted revised offer (replaces previous: £X, REJECTED)"`.
- The admin notification email now correctly says "updated" (vs "submitted") when it's a replacement.

### Frontend — OfferForm

`src/components/portal/OfferForm.tsx`:
- New `isUpdatable` / `isReplaceable` discriminators replace the simple `existingOffer ? PATCH : POST` choice.
  - PENDING → editable inline (uses PATCH)
  - REJECTED / WITHDRAWN → shows prior summary + "Submit revised offer" CTA (opens form, uses POST to replace)
  - ACCEPTED → locked-state display, no actions
- Submit button text: "Update Offer" (PATCH), "Submit Revised Offer" (POST replace), or "Submit Offer" (POST fresh).
- Prior offer summary in the replaceable state shows:
  - Amount, deposit %, financing
  - Previous status (REJECTED in red, WITHDRAWN in stone)
  - Vendor's decision note (verbatim, in italics)

The OfferForm pre-populates form fields with the prior offer's values (`useState(existingOffer?.amount ?? askingPrice)` etc) — so the investor can tweak the amount up without retyping everything.

## Tests

- `tests/api/offer.test.ts`:
  - Renamed `'rejects when offer already exists'` → `'rejects when an offer is already PENDING'`
  - New: `'rejects when offer has been ACCEPTED by vendor (no revisions allowed)'` → 409
  - New: `'allows POST when prior offer is REJECTED — replaces in transaction (C8)'` → 200, transaction with prepended delete op
  - New: `'allows POST when prior offer is WITHDRAWN — replaces in transaction (C8)'` → 200
  - New: `'REJECTED sets stage to PROPOSED (not FALLEN_THROUGH), allowing a counter-offer (C8)'` → asserts transaction has 3 ops (offer.update, deal.update, dealStageHistory.create)
- Prisma mock updated to include `prisma.offer.delete`.

## Verification

- 315/315 tests pass (was 311 → +4 new C8 tests)
- Production build clean — no schema migration

## Design notes

- **Hard-delete instead of soft-delete on replace**: chosen to preserve `Offer.dealId @unique` without schema changes. Audit trail lives in `DealStageHistory.note` ("replaces previous: £X, REJECTED"). If we ever want a full offer-history table, can add later with a migration.
- **Why PROPOSED, not OFFER_PENDING, on REJECTED**: a REJECTED offer reverts to "deal known, no live offer". The investor then submits a new offer, which auto-advances back to OFFER_PENDING (existing logic, unchanged) — same path as a first-time offer.
- **No new permissions or rate limits**: an investor could in theory spam revised offers. The PoF gate + intent=ACCEPT gate from PR #1 already filter the input; if it becomes a real issue, add a "max revisions per deal" cap or a cooldown.

## What's still open from the audit (unchanged scope)

- **C2** Was downgraded to safe in original audit — verified
- **C6** Invoice numbering race — needs a counter table; deferred (low probability under current volume)
- **H1** JWT keeps working after deletedAt — needs NextAuth callback work; deferred
- **H2** Property auto-create not cleaned up on stage rollback — UX work; deferred
- **H4** Stage transitions unenforced — needs a transition matrix; deferred
- All M-class and L-class items are still backlog
