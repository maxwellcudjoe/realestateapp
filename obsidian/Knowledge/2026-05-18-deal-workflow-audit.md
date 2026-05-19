---
title: "Deal-package workflow audit — security + correctness findings"
date: "2026-05-18"
language: "general"
status: "findings-ready"
tags: [audit, security, deal-workflow, phase-7-followup, premium-tier, invoicing]
---

# Deal-package workflow audit

End-to-end review of the deal lifecycle (admin posting → response → offer → stages → viewings → documents → completion → property → invoicing) plus the cross-cutting gates (PoF, Premium tier, auth). Conducted 2026-05-18 right after Phase 7 shipped.

> **Top three to fix first** — these all undermine the freshly-shipped Phase 7 revenue features:
> 1. **C5** Batch-post route omits `publishedAt` → Premium tier silently broken for primary deal-distribution path
> 2. **C1** Subresource APIs ignore the tier gate → Premium gate is UI-only, bypassable via direct API calls
> 3. **C7** Subscription cancellation immediately demotes tier → refund/chargeback liability when user cancels mid-period

---

## CRITICAL

### C1. Premium 48h gate is UI-only — all per-deal API routes bypass it

**Where**: `src/app/api/portal/deals/[dealId]/offer/route.ts:14-21` (`getDealForUser`), `.../viewings/route.ts:13-25` (`loadDealForUser`), `.../response/route.ts:20-38`, `.../documents/route.ts`, `.../documents/[docId]/url/route.ts`, `.../messages/route.ts`, `.../favourite/route.ts`. Visibility check exists only in `src/app/portal/deals/[dealId]/page.tsx:43` (page redirect) and `src/app/api/portal/deals/route.ts:24` (list filter).

**Repro**: A FREE-tier investor sees the upgrade banner "1 new deal available to Premium members" on `/portal/deals` but can lift the dealId from any side channel (push notification, email, prior session, guessing/iterating cuids). They then `POST /api/portal/deals/{dealId}/response` or `/offer` or `/messages` directly — all succeed.

**Impact**: Premium revenue feature is bypassable. A FREE user can ACCEPT and submit an offer hours before they're meant to even see the deal.

**Fix**: Bake `dealVisibilityWhere(tier)` into every `getDealForUser` helper in the portal routes. Cleanest: centralize via `src/lib/deal-access.ts` (see L3).

### C3. PoF gate not enforced on offer PATCH (edit)

**Where**: `src/app/api/portal/deals/[dealId]/offer/route.ts:90-124`.

**Repro**: Investor with fresh PoF submits a £1 offer (POST passes gate). PoF then expires. They PATCH the offer to £750k — no PoF check on PATCH, succeeds.

**Impact**: Binding-looking high-value offer sent to vendor without current proof of funds — exactly what the gate exists to prevent.

**Fix**: Add `if (!(await hasActiveProofOfFunds(deal.applicationId))) return 403 POF_REQUIRED` to PATCH.

### C4. Offer can be POSTed without `DealResponse.intent === 'ACCEPT'`

**Where**: `src/app/api/portal/deals/[dealId]/offer/route.ts:39-87`. UI gates OfferForm rendering on intent=ACCEPT ([page.tsx:100](src/app/portal/deals/[dealId]/page.tsx#L100)) but the API does not.

**Repro**: Investor with `DealResponse.intent = 'PASS'` (or no response) `curl`s POST → Offer row created, stage auto-advances PROPOSED → OFFER_PENDING ([offer/route.ts:77-83](src/app/api/portal/deals/[dealId]/offer/route.ts#L77)), admin gets a "new offer" email about a deal the investor explicitly rejected.

**Impact**: Stage history polluted with phantom offers; admin workflow corrupted; investor can re-engage after PASS without going through the response flow.

**Fix**: Include `response: true` in the offer route's `getDealForUser`; reject POST with 409 if `response?.intent !== 'ACCEPT'`.

### C5. `batch-post` does not set `publishedAt` — Premium gate silently disabled for the main deal-distribution path

**Where**: `src/app/api/admin/match/batch-post/route.ts:53-75`. Compare with `src/app/api/admin/investors/[id]/deals/route.ts:79` which correctly sets `publishedAt: new Date()`.

**Repro**: Admin uses the batch-post fan-out (the primary deal-pushing UI per the match flow). Created deals have `publishedAt = null`. `dealVisibilityWhere(FREE)` returns `OR: [{ publishedAt: null }, { publishedAt: { lte: cutoff } }]` — `null` is treated as "legacy, visible to all" ([deal-visibility.ts:11-14](src/lib/deal-visibility.ts#L11)). FREE users see batch-posted deals immediately.

**Impact**: Premium 48h head-start is silently broken for batch-posted deals. PREMIUM subscribers get no value on the very deals most likely to come from the match engine.

**Fix**: Add `publishedAt: new Date()` to the `prisma.deal.create` in `batch-post/route.ts`. Consider migrating to non-null + default(now()).

### C6. Invoice numbering race: retry budget is 1, collision-prone under concurrency

**Where**: `src/lib/invoice-numbering.ts:15-26`, used from `src/app/api/admin/invoices/route.ts:75-96` and `subscriptions/generate-renewals/route.ts:60-80`.

**Repro**: Two admins click "Issue invoice" within the same DB round-trip. `nextInvoiceNumber()` uses findFirst + increment with no transaction. Both compute `RB-2026-0042`. The losing INSERT throws P2002; the retry runs `nextInvoiceNumber()` again — still returns `0042` if the winner hasn't committed yet. Three concurrent issuances → unhandled P2002, 500 response.

**Impact**: Sporadic 500s on concurrent invoice issuance; sequence gaps possible (auditors expect monotonic).

**Fix**: Use a dedicated `InvoiceCounter` model with `update({ data: { seq: { increment: 1 } } })` per `(prefix, year)`, OR wrap select+insert in a `SERIALIZABLE` transaction. Increase retry budget to ≥ 5 with backoff.

### C7. Subscription cancellation immediately demotes `User.tier` to FREE — contradicts the schema spec

**Where**: `src/app/api/admin/subscriptions/[userId]/route.ts:84-99`. The schema comment at `prisma/schema.prisma:464-466` says: *"Cancelling sets cancelledAt but the tier remains PREMIUM until nextRenewalAt passes."* The implementation breaks this contract.

**Repro**: Investor pays for monthly Premium on day 1. Admin cancels on day 5 (mid-month). `User.tier` flips to FREE immediately; investor loses 25 days of paid Premium access.

**Impact**: Refund/chargeback risk; broken trust on cancellation flow.

**Fix**: On DELETE, only set `cancelledAt = now`. Build a small admin-triggered (or scheduled) job that demotes tier once `nextRenewalAt < now AND cancelledAt != null`. Add an `effectiveTier(user)` helper for runtime checks. Reconsider POST reactivation path (lines 50-60): it currently wipes `cancelledAt` and resets `nextRenewalAt` — define consistent behavior.

### C8. Vendor REJECTED → auto-jump to FALLEN_THROUGH eats the rest of the pipeline

**Where**: `src/app/api/admin/deals/[dealId]/offer-decision/route.ts:47`. `nextStage = decision === 'ACCEPTED' ? 'OFFER_ACCEPTED' : 'FALLEN_THROUGH'`.

**Repro**: Common UK-property scenario — vendor declines initial offer, investor wants to counter higher. Admin clicks "Vendor declined" → stage flips to FALLEN_THROUGH (terminal), `Offer.status = REJECTED`. Investor's OfferForm hidden (page.tsx:100 requires PENDING). No path to submit a revised offer without admin manual override.

**Impact**: UX deadlock for the most common real-world negotiation flow.

**Fix**: REJECTED should land in `PROPOSED` (or new `COUNTERED`/`OFFER_DECLINED` non-terminal stage). Allow new offer creation if the prior offer is REJECTED or WITHDRAWN (archive the old one rather than blocking on the `Offer.dealId @unique` constraint — add a `replacedAt` column).

---

## HIGH

### H1. Deleted (`User.deletedAt`) users keep working JWTs

**Where**: `src/lib/auth.ts:49` checks `deletedAt` on sign-in only; `src/lib/auth.config.ts:10-22` JWT callback never re-checks; middleware doesn't either. `POST /api/portal/account/delete` calls `signOut` non-fatally inside try/catch.

**Impact**: If `signOut` throws (network blip), the deleted user's JWT survives — for the session lifetime they can keep creating offers, viewings, messages.

**Fix**: Add a `deletedAt` check inside the NextAuth `jwt` callback (refresh against DB every ~5 min) or in middleware. Alternatively bump a session version on delete.

### H2. Property auto-creation never cleaned up on stage rollback

**Where**: `src/app/api/admin/deals/[dealId]/stage/route.ts:76-96`. `Property.dealId @unique` prevents duplicate Property on second COMPLETED transition (verified safe). But: COMPLETED → FALLEN_THROUGH does NOT delete the auto-created Property, and `completionDate` is set to `new Date()` (no way to override with actual completion date).

**Impact**: Investor's portfolio shows a phantom property they don't own; admin has no UI to clean it up.

**Fix**: On stage transition out of COMPLETED, prompt admin to delete or archive the Property. Allow `completionDate` override in the stage PATCH body.

### H4. Stage transitions are unenforced — admin can leave terminal states

**Where**: `src/lib/deal-stages.ts:1-4` ("not enforced") + stage PATCH route. Only validates the *destination* is in the stage set, not the transition.

**Repro**: Admin sets COMPLETED → creates Property + can issue SUCCESS invoice. Then sets PATCH to OFFER_PENDING. Property persists, SUCCESS invoice persists, a second SUCCESS invoice can be issued (the `hasSuccessInvoice` check in `admin/.../deals/[dealId]/page.tsx:45` excludes VOID-only — does NOT exclude existing PAID/SENT).

Wait — actually the gate is `!hasSuccessInvoice && stage === 'COMPLETED'`. If a PAID invoice exists, `hasSuccessInvoice` is true → button hides. **Reduced to MEDIUM** — the duplicate-invoice risk is mitigated. But the Property+stage drift remains.

**Fix**: Define a transition matrix (with optional "admin override + reason" escape hatch).

### H6. Offer POST race returns 500 instead of friendly 409

**Where**: `src/app/api/portal/deals/[dealId]/offer/route.ts:53-87`.

**Repro**: Investor double-clicks Submit. Both pass `if (deal.offer)`. Loser hits P2002 on `Offer.dealId @unique`, returns unhandled 500.

**Fix**: Catch P2002 → return 409 with friendly message.

### H7. DealResponse POST race: same as H6

**Where**: `src/app/api/portal/deals/[dealId]/response/route.ts:49`. Same pattern, same fix.

### H8. Bank reference and PaidReference passed unsanitized into invoice rendering

**Where**: `src/app/api/admin/invoices/[id]/route.ts:8-14` Zod is `z.string().max(255)` only. The reference appears on the PDF and in the receipt email body (HTML interpolation). Admin-controlled but still a self-XSS risk in admin browser when reviewing receipts.

**Fix**: Add a stricter regex (`^[A-Za-z0-9 _\-/.,]{1,255}$`) and HTML-escape on render.

---

## MEDIUM

### M1. PoF replacement deletes the prior document — no audit trail of which PoF backed which offer

**Where**: `src/app/api/portal/proof-of-funds/route.ts:54-65` (`deleteMany` then `create`).

**Fix**: Add `Document.supersededAt` and soft-delete on re-upload; pin offer to the active PoF doc id at submission time.

### M2. Subscription renewal idempotency uses fixed 25-day window — fragile for ANNUAL

**Where**: `src/app/api/admin/subscriptions/generate-renewals/route.ts:36-49`.

**Fix**: Derive window from billing period: `period === 'ANNUAL' ? 350 days : 25 days`.

### M3. Monetary `Number()` conversions can lose precision for high-value invoices

**Where**: `src/app/api/admin/deals/[dealId]/stage/route.ts:79-81` (Property.purchasePrice from `Number(deal.offer.amount)`), `src/lib/invoices.ts:21` (`calculateSuccessFee` uses JS-number math). `Math.round` mitigates but does not eliminate.

**Fix**: Use `Prisma.Decimal` for the success-fee calc.

### M4. Success-fee suggestion uses `askingPrice`, not `offer.amount`

**Where**: `src/app/admin/investors/[id]/deals/[dealId]/page.tsx:44`. UK success fees are usually % of *agreed price*, not asking. If buyer negotiated 10% down, the suggestion overstates fee by ~10%.

**Fix**: `calculateSuccessFee(Number(deal.offer?.amount ?? deal.askingPrice), pct)`.

### M5. Invoice PDF caches with `max-age=60` while containing PII

**Where**: `src/app/api/portal/invoices/[id]/pdf/route.ts:47-49` + admin equivalent.

**Fix**: `Cache-Control: no-store, private`.

### M6. `/api/portal/messages` POST body has no max length

**Where**: `src/app/api/portal/messages/route.ts:9-10` is just `z.string().min(1)`. Deal-scoped messages route correctly caps at 5000.

**Fix**: Add `.max(5000)`.

### M7. Email-template HTML injection in many spots

**Where**: Multiple — `src/app/api/admin/investors/[id]/deals/route.ts:91-106` interpolates `parsed.data.address/title/summary` raw; `src/app/api/admin/deals/[dealId]/stage/route.ts:124-132` interpolates raw `note` and `deal.address`. Admin-controlled but compromised-admin / self-XSS risk.

**Fix**: Centralise an HTML-escape helper; apply to every email template interpolation.

### M9. DealResponse DELETE while Offer exists creates orphan offer in UI

**Where**: `src/app/api/portal/deals/[dealId]/response/route.ts:124-138`.

**Repro**: Investor ACCEPTs → submits Offer → DELETEs their response. OfferForm hidden (page.tsx:100), but Offer row remains with PENDING status. Vendor decision can still flip Offer to ACCEPTED via admin endpoint with no investor-visible UI.

**Fix**: 409 if `deal.offer` exists (with status in PENDING/ACCEPTED). Or cascade-delete with confirmation.

---

## LOW

### L1. `Invoice.pdfBlobPath` schema field is unused

PDFs render on-demand; field never written. Either remove or wire archival.

### L2. `getDealForUser` patterns duplicated across 5 routes with subtle differences

**Fix**: Centralize in `src/lib/deal-access.ts` returning `{ deal, role, tierVisible }`. This is also the natural place to fix C1.

### L3. `prisma.config.ts` and `scripts/check-data.ts` untracked

Hygiene — were already untracked before this session.

### L4. `successFeePercent()` silently defaults to 1.5 when env unset

**Fix**: Log a warning on cold start when defaulting (so misconfiguration is visible).

### L5. No audit events on invoice issuance, PAID/VOID, or subscription start/cancel

`recordAudit` exists and is used for deal stage / offer decision / batch-post. Money-touching actions should be audited too.

**Fix**: Add `INVOICE_ISSUED`, `INVOICE_MARKED_PAID`, `INVOICE_VOIDED`, `SUBSCRIPTION_STARTED`, `SUBSCRIPTION_CANCELLED`.

### L6. Viewing requested-slot has no upper bound — investor can request a viewing in year 2099

`src/app/api/portal/deals/[dealId]/viewings/route.ts:74` checks `requestedSlot < new Date()` but no `requestedSlot > now + N days` cap.

### L7. Doc DELETE leaves orphaned blob in Azure Storage

Only deletes the DB row. Blob isn't addressable without the row so impact is low; cost leak.

---

## NOT-AN-ISSUE (verified)

- **Cross-tenant access**: every per-deal portal API correctly scopes via `application: { investorProfile: { userId } }`. A logged-in investor cannot access another investor's dealId.
- **Admin role gating** on `/api/admin/**`: consistently checked. Same for middleware blocking `/admin/*` server routes.
- **Property auto-create idempotency**: `findUnique({ where: { dealId } })` + unique constraint prevents duplication.
- **Admin cannot request viewings on behalf**: `viewings/route.ts:69-71` explicitly rejects admin POST.
- **Doc visibility (ADMIN_ONLY)** correctly gated in both list and download-URL.
- **Investor cannot delete admin-uploaded docs**: `[docId]/url/route.ts:51-53` requires owner+uploader.
- **Offer PATCH/DELETE transition checks**: correctly block editing once decided.
- **Invoice transition matrix** (`canTransition`): correctly enforces SENT→PAID gate; terminal states block further transitions.
- **PoF math** (setMonth -6) is DST-safe.
- **Soft-deleted investor's Application preserved** (required for MLR 7-year retention).

---

## Suggested fix sequence

**Quick wins (single PR, ~2-3 hours):**
1. **C5** — one-line fix: add `publishedAt: new Date()` to batch-post.
2. **C4** — load `response` in offer's `getDealForUser`, reject POST if intent ≠ ACCEPT.
3. **C3** — copy the PoF gate from offer POST into offer PATCH.
4. **C7** — remove `User.tier` update from cancel DELETE.
5. **H6/H7** — wrap Offer/Response create in try/catch for P2002.

**Architectural fix (~½ day):**
6. **C1 + L2** — centralize `getDealForUser` in `src/lib/deal-access.ts` with built-in tier+visibility filter. Update all 5 portal subresource routes to use it.

**Medium-term (½-1 day each):**
7. **C8** — REJECTED → PROPOSED + allow offer re-submission.
8. **C6** — proper invoice counter table.
9. **H1** — JWT `deletedAt` re-check.
10. **L5** — add audit events for money/subscription actions.

**Polish backlog**: M-class + L-class items.
