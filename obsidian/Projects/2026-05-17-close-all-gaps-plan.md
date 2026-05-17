---
title: "Close-All-Gaps Implementation Plan"
date: "2026-05-17"
language: "TypeScript / Next.js / Prisma"
status: "in-progress"
tags: [plan, roadmap, registration, kyc, deals, transaction, portfolio, compliance]
---

# Close-All-Gaps Implementation Plan

Sequenced plan to close every gap identified in
`Knowledge/2026-05-17-buyer-journey-gap-analysis.md`. Organised in 6 phases by
risk/dependency; phases 1–3 must run in order, phases 4–6 can be parallelised
once Phase 3 ships.

**Effort scale:** XS = <½ day, S = ½–1 day, M = 1–3 days, L = 3–5 days, XL = 1–2 weeks.

**Total estimated effort:** ~10–12 weeks single-developer.

---

## Phase 1 — Compliance & Security Hardening (P0 — must ship first)

Goal: stop the bleeding on AML, security, and dead-code risks before adding
new surface area.

### 1.1 Delete legacy `/api/register` (R23) — XS
- **Files:** delete `src/app/api/register/route.ts`
- **Test:** grep confirms no callers; `/register` page still redirects to `/onboarding`
- **AC:** repo no longer ships two registration paths with mismatched enums

### 1.2 Email verification + verify-before-sign-in (R1, R3) — M
- **Schema:** add `User.emailVerifiedAt DateTime?` and reuse `PasswordResetToken` pattern → new `EmailVerificationToken` model (userId, token, expiresAt)
- **API:** `POST /api/auth/verify-email/request` (resend), `GET /api/auth/verify-email/[token]` (consume)
- **Onboarding flow:** remove auto sign-in; redirect to `/verify-email-sent` page
- **Auth:** reject sign-in if `emailVerifiedAt` is null (configurable grace period)
- **Email template:** branded verification email (Resend)
- **AC:** new account cannot sign in until verification link clicked; resend works; tokens expire in 24h

### 1.3 CAPTCHA + rate limit on `/api/onboarding` (R2) — S
- **Choice:** Cloudflare Turnstile (free, no UX friction) or hCaptcha
- **Server:** verify token before Zod parse
- **Rate limit:** IP-based (Upstash Redis or simple in-memory LRU for Azure SWA)
- **AC:** scripted bot test cannot create >5 accounts/min from one IP

### 1.4 AML data capture: PEP, nationality, DOB, tax residency, source-of-funds (R4, R5, R6) — M
- **Schema:** extend `InvestorProfile`: `dateOfBirth Date`, `nationality String`, `taxResidency String`, `niNumber String?`, `isPep Boolean`, `pepDetails String?`, `sourceOfFunds String` (enum: SAVINGS, PROPERTY_SALE, INHERITANCE, GIFT, BUSINESS_PROFITS, OTHER), `sourceOfFundsDetail String?`
- **Wizard:** new `StepCompliance` between `StepPersonal` and `StepCriteria`
- **Validation:** Zod — DOB ≥18 derived, NI number format regex (UK), nationality dropdown (ISO 3166)
- **AC:** wizard collects all fields; admin detail page surfaces them in a Compliance panel

### 1.5 Separate marketing consent + stronger password (R7, R8) — S
- **Schema:** `InvestorProfile.marketingConsentAt DateTime?`
- **Wizard:** Review step gets a 5th checkbox (optional, not required) — "I'd like to receive deal alerts and market updates"
- **Password:** Zod adds complexity (1 upper, 1 lower, 1 digit, 1 special), client-side strength meter component, server-side HIBP `k-anonymity` check on the first 5 chars of SHA-1 hash
- **AC:** unchecked marketing checkbox does not block submit; weak passwords blocked client + server

### 1.6 2FA on login (X1) — M
- **Library:** `@simplewebauthn/server` (passkeys) OR TOTP via `otplib` + QR code
- **Recommend:** TOTP first (simpler, no device storage), passkeys in Phase 6
- **Schema:** `User.totpSecret String?`, `User.totpEnabledAt DateTime?`, `User.recoveryCodes Json?`
- **UI:** `/portal/security` page — enable/disable TOTP, view recovery codes
- **Auth:** NextAuth credentials callback — if TOTP enabled, require code in sign-in
- **AC:** enabling TOTP works, recovery codes can be regenerated, sign-in blocks without code

### 1.7 Account lockout + login activity log (X2) — S
- **Schema:** new `LoginAttempt` model (userId nullable for unknown email, ipAddress, success Boolean, createdAt)
- **Logic:** 5 failed attempts in 15 min from same IP → 15-min cooldown
- **UI:** `/portal/security` shows last 10 sign-ins
- **AC:** brute-force test gets blocked; user can see their own activity

**Phase 1 total: ~M+L = ~2 weeks**

---

## Phase 2 — Onboarding Completeness (P1)

Goal: capture everything needed for matching, transacting, and post-purchase.

### 2.1 Structured `targetAreas` — multi-select region/postcode-prefix (R10) — M
- **Schema:** new `TargetArea` model (id, investorProfileId, areaCode, areaLabel) — many-to-one with InvestorProfile; drop `targetAreas` String after migration
- **Data:** seed UK regions (London zones, M/B/LS/S/NE postcode prefixes, named towns)
- **UI:** typeahead multi-select component (`StepCriteria`)
- **Migration:** for existing rows, leave free text in a `legacyTargetAreas` column for admin to migrate manually
- **AC:** admin can query "investors targeting M postcode"; deals can be matched server-side

### 2.2 Multi-select strategy + fix `Any`/`All` mismatch (R11) — S
- **Schema:** new `InvestorStrategy` model (id, investorProfileId, strategy enum: BTL, HMO, FLIP, COMMERCIAL, SERVICED_ACCOM) — drop `strategy String`
- **Migration:** existing `BTL`/`HMO`/`Flip`/`Any` rows → 1-N rows (Any → all four)
- **Wizard:** checkbox group in `StepCriteria`
- **Update everywhere:** `lib/schemas/onboarding.ts`, all admin filters, deal-matching queries
- **AC:** investor can select multiple; `Any` no longer exists

### 2.3 Company / SPV fields (R9) — M
- **Schema:** new `BuyerEntity` model: type (INDIVIDUAL | LTD_COMPANY | LLP | TRUST), companyName?, companiesHouseNumber?, vatNumber?, registeredAddress?
- **Wizard:** new "Buyer Entity" radio in `StepPersonal` → conditional company fields
- **Default:** existing investors get an auto-created `INDIVIDUAL` entity
- **AC:** company buyers can specify SPV; companies house number validates against format

### 2.4 Experience, timeline, mortgage detail, referral (R12, R13, R14, R15) — S
- **Schema:** `InvestorProfile.experienceLevel String` (FIRST_TIME, 1_3_PROPERTIES, 4_10, 10_PLUS), `timelineToBuy String` (IMMEDIATE, 1_3_MONTHS, 3_6, 6_PLUS, EXPLORING), `mortgageStatus String?` (NONE, AIP, FULL_OFFER), `mortgageLender String?`, `maxLtv Int?`, `depositAvailable Decimal?`, `referralSource String?`
- **Wizard:** extends `StepCriteria`
- **AC:** all fields persist and surface on admin investor detail page

### 2.5 Address improvements (R16) — S
- **Choice:** `getaddress.io` or `ideal-postcodes.co.uk` (UK-specific, cheap)
- **Schema:** add `addressLine2 String?`, `country String @default("GB")`
- **UI:** postcode lookup component → populates lines 1, 2, city
- **Validation:** UK postcode regex server-side
- **AC:** typing valid postcode + clicking lookup populates address fields

### 2.6 Phone E.164 validation (R17) — XS
- **Library:** `libphonenumber-js`
- **UI:** country-code dropdown (default GB) + national number input
- **Storage:** E.164 (`+447700900000`)
- **AC:** invalid number blocked client + server

### 2.7 Wizard save/resume (R18) — S
- **Storage:** `localStorage` keyed by `onboarding-draft-v1`, cleared on submit
- **Restore:** check on mount; offer "Resume your application" banner
- **AC:** refresh mid-wizard restores all 4 step states

### 2.8 Profile-edit page (R20) — M
- **Page:** `/portal/profile`
- **API:** `PATCH /api/portal/profile` (Zod-validated subset of investor fields)
- **UI:** sectioned form — Personal / Criteria / Compliance / Marketing
- **Audit:** every change appends to a new `ProfileChangeLog` table
- **AC:** investor can update everything except DOB/nationality (admin-edit only)

### 2.9 Password change in portal (R21) — XS
- **Page:** `/portal/security` (already created in 1.6)
- **API:** `POST /api/portal/password/change` (require current password)
- **AC:** changes hash and revokes other sessions

### 2.10 GDPR data export + account deletion (R22) — M
- **Export:** `POST /api/portal/data-export` → background job (or sync zip if small) → emails JSON download link
- **Delete:** `POST /api/portal/account/delete` with email-confirm token → hard-deletes user + cascades; retains anonymised application history for AML record-keeping (7-year MLR requirement)
- **AC:** export contains every field tied to the user; delete removes PII but keeps audit-required rows with `deletedAt` + `redacted = true`

### 2.11 Welcome / post-onboarding landing page (R19) — XS
- **Page:** `/portal/welcome` shown once after first sign-in
- **Content:** "What happens next" — 4 cards explaining KYC stages
- **AC:** investor lands here after verification; subsequent logins go to dashboard

**Phase 2 total: ~3 weeks**

---

## Phase 3 — Deal Transaction Phase (P0 user-value)

Goal: close the post-acceptance dead-end. The biggest single product unlock.

### 3.1 Per-deal stage pipeline (T1) — L
- **Schema:**
  - `Deal.stage String @default("PROPOSED")` — enum: PROPOSED, OFFER_PENDING, OFFER_ACCEPTED, MEMO_OF_SALE, CONVEYANCING, SURVEY, MORTGAGE, EXCHANGED, COMPLETED, FALLEN_THROUGH
  - new `DealStageHistory` model — mirrors `StatusHistory` exactly (dealId, fromStage, toStage, changedByUserId, note, createdAt)
- **Admin UI:** `/admin/investors/[id]/deals/[dealId]` detail page with stage dropdown + note (mirrors `StatusPanel`)
- **Investor UI:** `/portal/deals/[id]` detail page with timeline + current stage badge
- **Email:** stage transitions trigger investor notification with stage-specific copy
- **AC:** admin can move stage; investor sees timeline; emails fire

### 3.2 Structured Offer model (T2, D5) — M
- **Schema:** new `Offer` model — dealId (unique), amount Decimal, depositPercent Int, financingSource (CASH | MORTGAGE | MIXED), targetExchangeDate Date?, conditions Json (array of {type, detail}), submittedAt
- **Investor UI:** "Make a formal offer" action on accepted deals → form with all fields
- **Admin UI:** offer card on `/admin/investors/[id]/deals/[dealId]`
- **Auto stage transition:** submitting offer moves deal `PROPOSED → OFFER_PENDING`
- **AC:** investor can submit offer, edit until vendor responds, then locked; admin can mark OFFER_ACCEPTED/REJECTED

### 3.3 Per-deal document room (T3) — M
- **Schema:** new `DealDocument` model — dealId, type (MEMO_OF_SALE, DRAFT_CONTRACT, SEARCHES, SURVEY, MORTGAGE_OFFER, EXCHANGE_CONTRACT, COMPLETION_STATEMENT, OTHER), uploadedByUserId, fileName, blobPath, uploadedAt, visibility (INVESTOR | ADMIN_ONLY)
- **Storage:** new Azure Blob container `revebatir-deal-docs`, path `{dealId}/{type}/{filename}`
- **Reuse:** existing `uploadDocument` + `generatePresignedUrl` helpers
- **UI:** "Documents" tab on the deal detail page (both admin and investor)
- **AC:** both sides can upload, view (5-min SAS), download; admin can mark visibility

### 3.4 Per-deal messaging thread (D7) — S
- **Schema:** `Message.dealId String?` (nullable — preserves existing application-scoped messages)
- **UI:** "Discussion" tab on deal detail page filters messages by dealId
- **Email:** keep existing notify-admin behaviour; subject prefixed with deal address
- **AC:** sending a message from deal page links it to that deal; existing `/portal/messages` still shows all

### 3.5 MORE_INFO reply loop (D6) — XS (after 3.4)
- **No new schema needed** — admin replies via the per-deal thread (3.4)
- **UI:** when investor's response intent is `MORE_INFO`, surface the thread inline on the DealCard
- **AC:** investor sees admin's reply on the deal card itself, not just in a separate Messages tab

### 3.6 Financial summary panel (T4) — S
- **Component:** computed view on deal detail page — Offer amount, deposit £, balance due, est. stamp duty (HMRC formula incl. surcharges from R5 nationality + 2nd-property logic), est. legal fees (configurable rate)
- **No schema:** all derived
- **AC:** numbers update reactively when offer changes or buyer entity changes

### 3.7 Deal-team handoff card (T5) — XS
- **Schema:** `Deal.dealLeadUserId String?`, `Deal.solicitorContact String?`, `Deal.brokerContact String?`
- **UI:** "Your team" card on deal detail page (visible once OFFER_ACCEPTED)
- **AC:** admin can assign team; investor sees contact info

**Phase 3 total: ~3 weeks** — biggest user-value unlock

---

## Phase 4 — Deal Discovery & Matching (P2)

### 4.1 Public ↔ portal bridge (D1) — M
- **Schema:** new `ContentfulDealInterest` model (userId, contentfulEntryId, createdAt)
- **UI:** "Save to my portal" CTA on public `/deals/[slug]` (only when authenticated)
- **Admin:** when promoting a Contentful deal to a real DB `Deal`, link to all `ContentfulDealInterest` rows and auto-create them as recipients
- **AC:** investor clicks save → appears on `/portal/deals` as "Saved interest"; admin sees who's interested

### 4.2 Favourites / shortlist (D2) — S
- **Schema:** `DealFavourite` (userId, dealId, createdAt) and same for Contentful
- **UI:** star toggle on deal cards
- **AC:** `/portal/deals?filter=favourites` works

### 4.3 Richer deal cards (D3) — M
- **Schema:** extend `Deal`: `photos Json` (Azure Blob URLs), `floorplanUrl String?`, `epcRating String?`, `tenure String?`, `rentalAppraisal Decimal?`, `grossYield Decimal?`, `netYield Decimal?`, `bedrooms Int?`, `propertyType String?`
- **Upload:** admin form gets photo/floorplan/EPC upload widgets (reuse Azure Blob)
- **AC:** DealCard shows hero image, key stats grid, ROI badges

### 4.4 Viewing booking (D4) — M
- **Schema:** new `Viewing` model (dealId, investorUserId, requestedSlot DateTime, confirmedSlot DateTime?, status: REQUESTED | CONFIRMED | DECLINED | COMPLETED, notes)
- **UI:** "Request viewing" on deal card → date picker → confirmation
- **Email:** admin notified; investor gets confirmation on admin response
- **AC:** investor requests slot, admin confirms/declines, both see in their views

### 4.5 Auto-match engine (depends on 2.1 + 2.2) — M
- **Logic:** when admin posts a deal, query investors where: budget overlap ∧ strategy intersection ∧ at least one matching target area ∧ status = ACTIVE_INVESTOR
- **UI:** admin "Post deal" form shows matched investor count + "Notify all matched" toggle
- **AC:** posting deal can fan out to N matched investors in one click; per-investor `Deal` rows created

**Phase 4 total: ~2 weeks**

---

## Phase 5 — Portfolio / Post-Completion (P3)

### 5.1 Properties view (P1) — L
- **Schema:** new `Property` model — created automatically when `Deal.stage → COMPLETED`. Fields: dealId (unique), userId, address, purchasePrice, completionDate, currentValueEstimate?, currentValueUpdatedAt?, tenancyStatus (VACANT | TENANTED | OWN_USE), monthlyRent Decimal?, tenancyStart Date?, tenancyEnd Date?
- **Page:** `/portal/properties` (list) + `/portal/properties/[id]` (detail)
- **AC:** completed deals show in properties view automatically

### 5.2 Property document archive (P2) — S
- **Reuse:** `DealDocument` model with a copy-on-complete trigger OR new `PropertyDocument` model — recommend the latter for clean separation
- **Types:** TITLE_DEED, EPC, GAS_SAFETY, EICR, INSURANCE, TENANCY_AGREEMENT, RENT_STATEMENT, OTHER
- **AC:** investor can upload + view; reminders for safety cert expiry (gas annual, EICR 5-year)

### 5.3 Portfolio metrics dashboard (P3) — M
- **Component:** `/portal/properties` header — total invested, total monthly rent, gross yield, occupancy %, equity (if mortgage value tracked)
- **No new schema needed**
- **AC:** numbers reflect Property table aggregates

### 5.4 Align homepage promise (P4) — XS
- **File:** `src/components/home/HowItWorks.tsx`
- **Edit:** step 4 copy now matches delivered product (or leave aspirational with a footnote)
- **AC:** marketing matches reality

**Phase 5 total: ~2 weeks**

---

## Phase 6 — KYC Modernisation & Cross-cutting (P3)

### 6.1 KYC provider integration (K1, K2) — L
- **Choice:** Onfido (UK-strong, well-documented) or SumSub (cheaper, global)
- **Replace:** manual document upload flow → provider-hosted SDK
- **Schema:** `Application.kycCheckId String?`, `Application.kycResult Json?`, keep `Document` table for backwards compat / non-KYC docs
- **AC:** investor completes provider flow; admin sees pass/fail + audit trail

### 6.2 Re-KYC reminders + document expiry (K3) — S
- **Schema:** `Application.kycCompletedAt`, `Application.kycExpiresAt` (= +18 months); `Document.expiresAt Date?` for passports
- **Job:** daily cron → email investors 30 days before expiry → mark application `REKYC_REQUIRED`
- **AC:** automatic stage transition + email

### 6.3 Document review actions (K4, K5, K7) — S
- **Schema:** `Document.reviewedByUserId`, `Document.reviewedAt`, `Document.reviewNotes` (per-document, not application-level)
- **UI:** admin doc panel gains Approve / Reject buttons + per-doc note
- **Dynamic slots:** admin can add custom slot via "Request additional document" button — creates a placeholder row the investor sees
- **AC:** per-doc audit; admin can request ad-hoc documents

### 6.4 Notifications centre (X3) — M
- **Schema:** new `Notification` model (userId, type, title, body, link, readAt, createdAt)
- **UI:** bell icon in portal header → dropdown → unread count
- **Triggers:** centralise — replace ad-hoc emails with `createNotification()` helper that also sends email
- **AC:** every existing email-trigger also creates a notification

### 6.5 Portal dashboard (X4) — S
- **Page:** new `/portal` index (was: redirect to status)
- **Content:** 4 cards — current KYC stage, open deals (count + top 3), unread messages, recent notifications
- **AC:** lands here after sign-in; status tab still works

### 6.6 Hardcoded admin email cleanup (X5) — XS
- **Env:** `ADMIN_EMAIL=info@revebatir.co.uk` in `.env`
- **Grep + replace:** `src/app/api/portal/documents/submit/route.ts:69` and all sibling routes
- **AC:** grep `info@revebatir.co.uk` in `src/` returns zero hits

### 6.7 Full audit log (X6) — M
- **Schema:** new `AuditEvent` model (id, actorUserId, action, resourceType, resourceId, metadata Json, createdAt, ipAddress)
- **Wrap:** key actions — document view, message send, deal response create/update/delete, profile change, login, status change
- **UI:** admin-only `/admin/audit` searchable view
- **AC:** every privileged action recorded; compliance can export by date range

### 6.8 Passkeys upgrade (X1 continuation) — M
- **Library:** `@simplewebauthn/browser` + `@simplewebauthn/server`
- **Coexist with TOTP** — let user enrol either or both
- **AC:** can register passkey, sign in with passkey, recover via TOTP/recovery code

**Phase 6 total: ~3 weeks**

---

## Sequencing Summary

```
Week 1–2:  Phase 1 (compliance/security)         ← blocks public scaling
Week 3–5:  Phase 2 (onboarding completeness)     ← depends on 1
Week 6–8:  Phase 3 (deal transaction)            ← highest value unlock
Week 9–10: Phase 4 (matching + viewings)         ← unlocked by 2.1/2.2
Week 11–12: Phase 5 (portfolio)                  ← unlocked by 3.1
Week 11–13: Phase 6 (KYC modernisation)          ← parallel with 5
```

Phases 4, 5, 6 can run in parallel after Phase 3 ships if more than one
developer is available.

---

## Risk Notes

- **Migrations:** Phase 2 (especially 2.1, 2.2, 2.3) requires data migration of existing investor rows. Write reversible migrations + a backfill script per change. Run on a copy of prod first.
- **Email volume:** Phase 6.4 + every new notification trigger increases Resend cost — batch where possible, throttle per-user.
- **KYC provider switch (6.1):** invalidates existing manually-reviewed docs — keep dual-path for 90 days, force re-KYC on next stage transition.
- **Compliance review:** Phase 1 changes (especially R4–R7) should be reviewed by a compliance/legal advisor before launch.
- **Test coverage:** maintain TDD discipline established in earlier tasks (Vitest, integration tests per API route). No new endpoint ships without tests.

---

## Quick Wins (one-day each, do in parallel with Phase 1)

| Task | Effort | Gap |
|---|---|---|
| Delete legacy `/api/register` | XS | R23 |
| Remove `DRIVING_LICENCE` from enum or wire to UI | XS | R24 (handoff) |
| Replace hardcoded admin email with env var | XS | X5 |
| Add client-side file size validation on doc upload | XS | K6 (handoff) |
| Align HowItWorks step 4 copy | XS | P4 |

5 hours of work, big tidiness payoff.
