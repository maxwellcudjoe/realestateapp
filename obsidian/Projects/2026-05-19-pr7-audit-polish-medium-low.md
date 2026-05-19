---
title: "PR #7 — Audit polish (M2, M3, M4, M6, M9, L4, L5, L7)"
date: "2026-05-19"
language: "typescript"
status: "complete"
tags: [audit-followup, polish, correctness, audit-trail]
---

# PR #7 — Audit polish batch

Closes 5 MEDIUM + 3 LOW items from the deal-workflow audit. Pure cleanup — no behavior changes that aren't pure bug fixes or audit-trail additions. No schema migration needed.

## Fixes shipped

### M2 — Renewal idempotency window scales with billing period

`src/app/api/admin/subscriptions/generate-renewals/route.ts`. Was hardcoded 25 days; now: `period === 'ANNUAL' ? 350 : 25`. Annual subscribers no longer get accidentally re-billed (in theory — the prior `nextRenewalAt` filter would have caught it anyway, but the explicit per-period window is the right design).

### M3 — Property.purchasePrice uses Prisma.Decimal directly

`src/app/api/admin/deals/[dealId]/stage/route.ts`. Was `Number(deal.offer.amount)` (safe for amounts under 2^53 but principle-impure). Now passes the Prisma.Decimal through directly — Prisma's adapter handles it. Audit-friendly: no JS-float round-trip on a money column.

### M4 — Success-fee suggestion uses the accepted offer amount

`src/app/admin/investors/[id]/deals/[dealId]/page.tsx`. UK success fees are normally a % of the *agreed price* (the accepted offer), not the asking price. If a buyer negotiated down to 90%, the prior suggestion overstated the fee by ~10%.

Logic: `deal.offer?.status === 'ACCEPTED' ? Number(deal.offer.amount) : Number(deal.askingPrice)`. Description string also updated to reflect the base used.

### M6 — `/api/portal/messages` POST body capped at 5000 chars

`src/app/api/portal/messages/route.ts`. Matches the per-deal messages route which already had the cap. Closes the inconsistency.

### M9 — DealResponse DELETE refuses to orphan an active offer

`src/app/api/portal/deals/[dealId]/response/route.ts`. The old behaviour let an investor remove their response while still having a PENDING or ACCEPTED offer — the OfferForm would hide but the offer was still alive, and admin could flip it to ACCEPTED with no investor-visible UI. Now returns 409 `OFFER_ACTIVE` with the message "Withdraw the active offer first before removing your response." Also migrated to `getInvestorDeal` for tier-gate consistency (was using local helper).

### L4 — Warn-once on missing `REVE_BATIR_*` env vars

`src/lib/invoices.ts` + `src/lib/subscriptions.ts`. When `successFeePercent`, `premiumMonthlyAmount`, `premiumAnnualAmount`, or any of the four `REVE_BATIR_BANK_*` defaults are kicked in, log a `[config] KEY unset — using default "X"` warning to stderr exactly once per process. Server-side only (`typeof window === 'undefined'`) — client bundles don't log on every render. Helps spot misconfigured deploys in Azure App Insights without spamming.

### L5 — Audit events on money + subscription mutations

`src/lib/audit.ts` — 7 new action codes:
- `INVOICE_ISSUED`
- `INVOICE_MARKED_PAID`
- `INVOICE_VOIDED`
- `INVOICE_DELETED`
- `SUBSCRIPTION_ACTIVATED`
- `SUBSCRIPTION_CANCELLED`
- `SUBSCRIPTION_RENEWAL_RUN`

Wired into:
- `POST /api/admin/invoices` → INVOICE_ISSUED (with `userId`, `dealId`, `type`, `amount`, `sendNow`)
- `PATCH /api/admin/invoices/[id]` → INVOICE_MARKED_PAID (with `paidReference`) or INVOICE_VOIDED (with `priorStatus`)
- `DELETE /api/admin/invoices/[id]` → INVOICE_DELETED
- `POST /api/admin/subscriptions/[userId]` → SUBSCRIPTION_ACTIVATED (with `reactivation: true|false`, `preservedRenewal: true|false`, `nextRenewalAt`)
- `DELETE /api/admin/subscriptions/[userId]` → SUBSCRIPTION_CANCELLED (with `accessUntil` for the C7 paid-until-renewal-passes window)
- `POST /api/admin/subscriptions/generate-renewals` → SUBSCRIPTION_RENEWAL_RUN (with `horizonDays`, `userIdsFilter`, `createdCount`, `skippedCount`, `totalScanned`). When triggered by the cron Bearer-token path, `actorRole` is recorded as `'cron'`. Dry-runs skip the audit write (preview only).

Every money-touching admin action is now traceable in the audit log. Compliance + dispute-resolution win.

### L7 — `deleteBlob` helper + applied to all 4 doc-replace/delete sites

`src/lib/azure-blob.ts` — new `deleteBlob(blobPath)` helper using `deleteIfExists()`. Non-fatal: failures are logged but the caller's DB delete is the source of truth (an orphaned blob is recoverable; a DB row whose blob deletion threw and rolled back the request would be worse).

Wired into:
- `DELETE /api/portal/deals/[dealId]/documents/[docId]/url` (DealDocument DELETE)
- `DELETE /api/portal/properties/[propertyId]/documents/[docId]/url` (PropertyDocument DELETE)
- `POST /api/portal/proof-of-funds` (replaces prior PoF — old blob now cleaned up)
- `POST /api/portal/documents` (replaces prior same-type KYC doc — old blob now cleaned up)

Closes the Azure Blob orphan-cost leak that was on the audit's "not-an-issue but worth noting" list.

## Tests (+5 over PR #6, total 373/373 pass)

- `tests/api/response.test.ts` — new `describe` block for DELETE (M9): 5 tests covering active-offer guard with PENDING/ACCEPTED rejections, WITHDRAWN allowed, no-offer allowed, no-response 404.
- `tests/api/subscriptions.test.ts` — existing C7 test mock extended with `billingPeriod` + `nextRenewalAt` (now required by the audit metadata).

## Verification

- 373/373 tests pass (was 368)
- Production build clean
- No schema migration

## Out of scope (still open)

- **C6** — Invoice numbering counter table. Schema in repo, awaiting Azure SQL firewall whitelist for IP `154.161.38.129`.
- **L1** — Remove unused `Invoice.pdfBlobPath` field. Needs schema migration (drop column). Bundle with C6 when firewall is open.
- **L3** — `prisma.config.ts` + `scripts/check-data.ts` untracked. User-owned files; not my call to commit them.

## Audit close-out status

| Severity | Closed | Open |
|---|---|---|
| CRITICAL | C1, C3, C4, C5, C7, C8 (6) | **C6** (awaiting firewall) |
| HIGH | H1, H2, H4, H6, H7, H8 (6) | — |
| MEDIUM | M2, M3, M4, M6, M7, M9 (6) | M1, M5, M8 |
| LOW | L2, L4, L5, L6, L7 (5) | L1, L3 |

13 → 23 of 27 audit items closed (counting M7 + M8 as resolved-by-PR-#4 and L6 by PR #4). Remaining: C6, M1 (PoF audit trail — needs `supersededAt` column), M5 (no-store cache header on PDF — cosmetic), M8 (notification spam, already verified safe), L1 (drop unused column), L3 (untracked user files).
