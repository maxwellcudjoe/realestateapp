---
title: "Task 7.2 — Proof-of-funds gate"
date: "2026-05-17"
language: "typescript"
status: "complete"
tags: [phase-7, kyc, deals, viewings, offers, compliance]
---

# Task 7.2 — Proof-of-funds gate

Blocks investors from requesting viewings or submitting offers without a fresh proof-of-funds document (bank statement or mortgage AIP within 6 months). Distinct from the one-time `SOURCE_OF_FUNDS` KYC doc — PoF is transaction-time evidence of liquidity that goes stale.

## What changed

### Library

- **`src/lib/proof-of-funds.ts`** — `POF_FRESHNESS_MONTHS = 6`, `POF_DOC_TYPE = 'PROOF_OF_FUNDS'`, plus `hasActiveProofOfFunds(applicationId)`, `getMostRecentProofOfFunds(applicationId)`, `pofCutoffDate(now)`, `isPofFresh(uploadedAt, now)`.

### API

- **`src/app/api/portal/proof-of-funds/route.ts`** — new `POST` endpoint. Accepts PDF/JPG/PNG up to 10 MB, uploads to Azure Blob at `pof/{applicationId}/{uuid}.{ext}`, replaces any existing PoF doc (`deleteMany` then `create`), works regardless of `Application.status` (since PoF is needed at viewing/offer time, often long after KYC approval).
- **`src/app/api/portal/deals/[dealId]/viewings/route.ts`** — POST now calls `hasActiveProofOfFunds(deal.applicationId)`; returns `403 { code: 'POF_REQUIRED' }` if absent.
- **`src/app/api/portal/deals/[dealId]/offer/route.ts`** — POST now applies the same gate. PATCH is unaffected (editing an existing offer doesn't require re-proof).

### UI

- **`src/components/portal/ProofOfFundsGate.tsx`** — new client component. Gold-bordered banner with explainer text, file picker, "Upload proof of funds" button. Calls `router.refresh()` on success. Surfaces stale doc metadata if one exists ("Last uploaded: statement.pdf on 5 Aug 2025 — now stale, please re-upload").
- **`src/app/portal/deals/[dealId]/page.tsx`** — server-fetches PoF state via `Promise.all([hasActiveProofOfFunds(...), getMostRecentProofOfFunds(...)])`; renders `<ProofOfFundsGate>` above the post-viewing prompt when `!pofFresh`.

### Tests

- **`tests/lib/proof-of-funds.test.ts`** — 10 tests (constants, cutoff date math, isPofFresh boundary cases, hasActiveProofOfFunds + getMostRecentProofOfFunds with mocked prisma).
- **`tests/api/viewing.test.ts`** — added 5 tests for investor POST (creates with PoF, rejects unauth, admin-cannot-request, past-slot, **rejects without PoF returning `POF_REQUIRED`**).
- **`tests/api/offer.test.ts`** — added 1 test (**rejects offer without PoF returning `POF_REQUIRED`**); existing tests updated to mock `hasActiveProofOfFunds` returning true so they continue to pass.

## Design notes

- **PoF is separate from SOURCE_OF_FUNDS**: SOURCE_OF_FUNDS is a one-time KYC provenance check ("inheritance from grandmother in 2018"). PoF is a freshness-sensitive liquidity proof ("I have £X in this bank account today"). They share the `Document` table but use different `type` values and live in different blob paths (`kyc/...` vs `pof/...`).
- **6-month freshness**: UK MLR doesn't specify PoF freshness, but 3 months is conservative for bank statements and 6 months is reasonable for mortgage AIPs. We default to 6 months for both — relaxes the burden on returning investors without compromising materially.
- **Server-side enforcement is the boundary**; the UI banner is just so investors don't hit a confusing 403 on form submit. The 403 responses include `code: 'POF_REQUIRED'` so client code can give targeted error messages.
- **No admin review required v1**: PoF docs land with `reviewStatus = 'PENDING'`. Admin can see them in the existing Documents panel but the gate doesn't wait for approval — the file presence is enough. Adding mandatory admin approval would be a follow-up if abuse appears.

## Verification

- 229/229 tests pass (16 new + all existing)
- Production build clean — new `/api/portal/proof-of-funds` route compiled
