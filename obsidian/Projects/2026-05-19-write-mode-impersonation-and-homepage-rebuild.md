---
title: "Write-mode impersonation + homepage rebuild (Sprints 1-8)"
date: "2026-05-19"
language: "typescript"
status: "complete"
tags: [impersonation, homepage, marketing, conversion, pricing, faq, seo]
---

# Write-mode impersonation + homepage rebuild

Two distinct bodies of work shipped in one session:

1. **Write-mode impersonation** — the security-deferred follow-up from [[2026-05-19-admin-profile-deferred-items]]
2. **Homepage rebuild** — Sprints 1-8 from [[2026-05-19-homepage-assessment]]

**Outcome**: 502 → 520 tests (+18). Build clean. No schema delta.

## 1 · Write-mode impersonation

The original read-mode impersonation blocked all writes via middleware. Write-mode lets the admin perform actions on the investor's behalf (e.g. "they asked me to upload this on the phone") while preserving the admin's identity in every audit event.

**Threat-model additions** beyond read-mode:

| Concern | Mitigation |
|---|---|
| Admin acts maliciously while in write-mode | Every `AuditEvent` recorded during impersonation auto-injects `impersonator: adminId` + `impersonationMode: 'write'` via the audit lib. Admin can never erase their identity from the trail. |
| Accidental write-mode activation | Requires explicit `mode: 'write'` in the POST body. Default is still read-only — backwards-compatible. |
| Write-mode without justification | Requires `reason ≥ 3 chars` at activation. Reason persists into the cookie payload and into the `IMPERSONATION_STARTED` audit metadata. |
| Banner doesn't differentiate the two | The banner now renders with `bg-red-600/30` + `border-y-2` + bold "WRITE-MODE" label vs the lighter read-mode banner. |

**Library changes — `src/lib/impersonate.ts`**:
- New `ImpersonateMode = 'read' | 'write'` type
- `signImpersonateCookie` accepts optional `mode` (default `'read'`) and `reason`
- `ImpersonatePayload` gains `mode` and optional `reason` fields
- `verifyImpersonateCookie` defaults `mode` to `'read'` if missing (handles pre-write-mode cookies)
- `isBlockedDuringImpersonation(method, pathname, mode)` returns `false` when `mode === 'write'`
- `maybeRefreshImpersonateCookie` preserves `mode` and `reason` across refreshes

**Audit lib — `src/lib/audit.ts`**:
- `recordAudit` now reads `cookies()` (from `next/headers`), verifies the impersonate cookie, and auto-injects `impersonator: adminId` + `impersonationMode` into the metadata when valid. **All 28+ existing call sites get this for free** — no changes needed at the call site.
- Wrapped in try/catch so a non-request context (e.g. tests) doesn't break audit writes.

**Endpoint — `POST /api/admin/users/[userId]/impersonate`**:
- New Zod body schema: `{ mode?: 'read'|'write', reason?: string }`
- Refine: `mode === 'write'` requires `reason ≥ 3 chars`, else 400 `VALIDATION_ERROR`
- Response now includes `mode` in the JSON body
- `IMPERSONATION_STARTED` audit metadata includes `mode` + `reason`
- `IMPERSONATION_ENDED` audit metadata includes the duration AND the original mode

**Middleware — `src/middleware.ts`**:
- Passes `impersonatePayload.mode` to `isBlockedDuringImpersonation` so write-mode requests sail through

**Auth callback — `src/lib/auth.ts`**:
- Session overlay now includes `impersonationMode: payload.mode`

**Type augmentation — `src/types/next-auth.d.ts`**:
- `Session.user.impersonationMode?: 'read' | 'write'`

**Banner — `src/components/ImpersonationBanner.tsx` + `ImpersonationBannerClient.tsx`**:
- Server component passes `mode` to the client banner
- Write-mode: `bg-red-600/30 border-y-2 border-red-500`, bold "WRITE-MODE" label with target email underlined, copy "every action is recorded against your admin id"
- Read-mode: existing lighter styling, copy "read-only — writes are blocked"

**UserActionsPanel** (`src/components/admin/UserActionsPanel.tsx`):
- Two impersonate buttons: "Impersonate (read-only)" and "Impersonate (write-mode)"
- Write-mode opens a confirm modal with required reason
- Action keys split: `impersonate-read` and `impersonate-write`; both POST to `/impersonate` with different bodies

**Tests** (`tests/lib/impersonate.test.ts` + `tests/api/admin-impersonate.test.ts`):
- Defaults to read mode + reason undefined
- Round-trips write mode + reason through sign/verify
- `isBlockedDuringImpersonation` returns false for any method when mode='write'
- 400 when write-mode requested without reason
- 400 when write-mode reason too short
- 200 + audit metadata includes mode + reason for write-mode
- Explicit read-mode body also works (backward compat)

Test count: 498 → 510 (+12) for write-mode alone.

## 2 · Homepage rebuild (Sprints 1-8)

Implementation of [[2026-05-19-homepage-assessment]]. The product is now a 2026 investor SaaS; the homepage was selling a 2025 newsletter. Eight sprints close the gap.

### Sprint 1 — Hero refresh + TrustStrip

- **`Hero.tsx`** new copy: "The UK Property Deal Platform · Built For Investors." Category-naming headline replaces "We Find The Deal. You Build The Wealth." Subhead names the four pillars (deals, pipeline, KYC/AML, portal). Premium-from-£X/month line under CTAs.
- New **`TrustStrip.tsx`** — server component that calls `getHomepageMetrics()` and renders 4 live stats (Deals YTD, Verified investors, Total transactions, Completed deals) plus 3 registry-linking compliance chips (HMRC, ICO, Companies House → each links to public register).
- New **`src/lib/homepage-metrics.ts`** with `getHomepageMetrics()` + `formatTrustNumber()` + `formatTrustGbp()` (rounds down for credibility — never 0.something, never inflated).
- Tests: `tests/lib/homepage-metrics.test.ts` (9 cases for both formatters).

### Sprint 2 — PlatformFeatures + 8-step HowItWorks

- New **`PlatformFeatures.tsx`** — 6-card grid replaces the 3-emoji `WhatWeDo`. Cards: Verified Deal Sourcing · Investor Portal · 48h Premium Head Start · End-to-End Pipeline · Compliance Built In · Portfolio Tracker.
- Rewrote **`HowItWorks.tsx`** from 4 steps to 8: Register · Set Criteria · Matched Deals · Respond · Viewing · Offer · Pipeline · Portfolio. Section title is now "From signup to completion" with subhead "Most sourcers stop after the deal pack. We track every step through to the keys in your hand."

### Sprint 3 — PricingBlock

- New **`PricingBlock.tsx`** — side-by-side Free vs Premium comparison with 11 feature rows. Live amounts pulled from `premiumMonthlyAmount()` / `premiumAnnualAmount()` at build time. Calculates and displays annual saving percentage. Premium card has "Recommended" badge in gold and a subtle left-border accent.
- Footer line: "Sourcing and success fees may apply on a per-deal basis — see your portal invoices for full transparency."

### Sprint 4 — Auth-aware FeaturedDeal

- **`FeaturedDeal.tsx`** is now an async server component that calls `auth()` + reads `User.tier`.
- CTA branches: authed → `View Full Pack` → `/portal/deals`; anonymous → `Register to View Pack` → `/onboarding`.
- "Premium sees this 48h early" chip overlay when viewer is not Premium.
- "+N more deals live in the portal" counter line shows live `Deal.count({ status: 'OPEN' })`.
- Second CTA: "View All Deals in Portal →" for authed users, "Browse Public Deals →" for anonymous.

### Sprint 5 — PlatformProof (replaces fake testimonials)

- New **`PlatformProof.tsx`** — server component that queries: deals last 12 months, total brokered (sum of completed `Property.purchasePrice`), completion count, distinct target areas covered. Hides itself entirely if the platform genuinely has no activity yet (avoid "0 deals" embarrassment).
- Copy explicitly notes: "Real data, refreshed nightly. We don't round up. We don't add projected numbers. If a stat looks small, it's because we're selective."
- The old `Testimonials.tsx` component is left in the codebase (not imported by the homepage) — can be re-introduced as a section with real consenting investors later.

### Sprint 6 — FAQ with FAQPage schema

- New **`Faq.tsx`** — 10 questions covering: regulation, cost, KYC timing, BMV definition, no-fee-on-browse, SPVs/Ltd companies, agent-vs-introducer, post-completion portfolio, GDPR export/deletion, Premium cancellation.
- Each `<details>` element for native expand/collapse + SEO.
- `FAQPage` JSON-LD emitted inline so rich-result eligibility is immediate.
- Footer link to `/contact` for unanswered questions.

### Sprint 7 — Standalone `/pricing` page

- New **`src/app/pricing/page.tsx`** with full metadata (title, description, canonical).
- Sections: Hero · embedded `PricingBlock` · "Per-Deal Fees" table (registration · subscription · sourcing · success) · "Payment Flow" (4 steps; bank-transfer-only emphasised) · embedded `Faq` · "Still deciding?" CTA with annual saving callout.
- "Need a tailored arrangement?" → `/contact`.

### Sprint 8 — Standalone `/tour` page

- New **`src/app/tour/page.tsx`** — 8 alternating-layout stops mirroring the 8-step lifecycle:
  - Onboarding (KYC + AML) · Matched Deals · Response + Viewing · Structured Offer · Pipeline Tracking · Invoicing · Portfolio · Security + GDPR
- Each stop has a "Portal screenshot" placeholder (gold-gradient block) and 4 bullet highlights. Placeholders can be swapped for real screenshots without code changes.
- Closing CTA: "Ready to get in?" with Register Free + View Pricing buttons, plus "Already an investor? Sign in →".

### Cross-cutting

- **`CtaBanner.tsx`** rewritten: "Three minutes to register. A lifetime of compounding." Two side-by-side buttons: "Register Free" + "Start Premium · £X/mo" (live amount).
- **`Navbar.tsx`** gains two new links: **Pricing** + **Tour**.
- Homepage section order is now: Hero → TrustStrip → PlatformFeatures → HowItWorks → FeaturedDeal → PricingBlock → WhyReveBatir → PlatformProof → Faq → CtaBanner.

## Files changed (summary)

**New** (10 files):
- `src/lib/homepage-metrics.ts`
- `src/components/home/TrustStrip.tsx`
- `src/components/home/PlatformFeatures.tsx`
- `src/components/home/PricingBlock.tsx`
- `src/components/home/PlatformProof.tsx`
- `src/components/home/Faq.tsx`
- `src/app/pricing/page.tsx`
- `src/app/tour/page.tsx`
- `tests/lib/homepage-metrics.test.ts`
- (obsidian Project + Knowledge notes)

**Modified** (substantial):
- `src/app/page.tsx` — full reorder, new imports
- `src/components/home/Hero.tsx` — new copy + structure
- `src/components/home/HowItWorks.tsx` — 4 → 8 steps
- `src/components/home/FeaturedDeal.tsx` — auth-aware CTAs
- `src/components/home/CtaBanner.tsx` — decision-prompting close
- `src/components/layout/Navbar.tsx` — added Pricing + Tour links
- `src/lib/impersonate.ts` — mode + reason support
- `src/lib/auth.ts` — impersonationMode in session overlay
- `src/lib/audit.ts` — auto-inject impersonator metadata
- `src/middleware.ts` — mode-aware blocking
- `src/types/next-auth.d.ts` — impersonationMode session field
- `src/components/ImpersonationBanner.tsx` + `ImpersonationBannerClient.tsx` — mode-aware copy + styling
- `src/components/admin/UserActionsPanel.tsx` — read vs write buttons
- `src/app/api/admin/users/[userId]/impersonate/route.ts` — body schema

**Unused but retained** (left in the codebase for possible future use):
- `src/components/home/WhatWeDo.tsx` — original 3-service grid
- `src/components/home/Testimonials.tsx` — original 3 fake testimonials

**Tests**: 502 → 520 (+18). All passing. Build clean.

## What's still open

- **Sprint 9** (Insights / blog teaser): deferred until content team produces 3 evergreen articles
- **Sprint 10** (Area-specific landing pages `/btl/manchester` etc.): deferred until content team selects priority cities
- **Real portal screenshots** for `/tour` — currently placeholder gold-gradient blocks. Should be swapped for actual screenshots before launch.
- **Real investor testimonials** with consent + photos — could re-instate the `Testimonials` section once available.
- **Open Graph image for `/pricing` and `/tour`** — should be designed alongside content team.

## 🤖 AI Prompts Used

User asked to "implement this [write-mode impersonation] and also all the other ones identified" — referring to the deferred write-mode item plus the homepage assessment sprints. Same multi-turn session.

📁 Save this note to: obsidian/Projects/2026-05-19-write-mode-impersonation-and-homepage-rebuild.md
