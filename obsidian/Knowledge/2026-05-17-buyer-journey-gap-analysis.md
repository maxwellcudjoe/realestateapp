---
title: "Buyer (Investor) Journey — Comprehensive Gap Analysis"
date: "2026-05-17"
language: "general"
status: "in-progress"
tags: [analysis, ux, investor, buyer-journey, registration, kyc, compliance, roadmap]
---

# Buyer (Investor) Journey — Comprehensive Gap Analysis

Reviewed every step in the buyer funnel from public-site landing through
post-completion. Below: full flow map, then gaps per stage with severity and
recommended fix.

## Full Flow Map (today)

| # | Stage | Surface | Status |
|---|---|---|---|
| 0 | Discover | `/`, `/deals` (Contentful), `/about`, `/contact` | ✅ live |
| 1 | Register / Onboard | `/register` → `/onboarding` (4-step wizard) | ⚠️ thin |
| 2 | Application created | DB `Application.status = SUBMITTED`, 2 emails | ✅ |
| 3 | Auto sign-in | NextAuth credentials → `/portal/status` | ⚠️ security |
| 4 | Admin review (KYC) | 7-stage status: UNDER_REVIEW → … → ACTIVE_INVESTOR | ✅ but manual |
| 5 | KYC documents | 3 fixed slots (Passport, POA, Source of Funds) | ⚠️ thin |
| 6 | Personalised deals | `/portal/deals` — admin posts, investor responds | ✅ live |
| 7 | Deal response | ACCEPT / MORE_INFO / PASS + free comment | ⚠️ signal-only |
| 8 | Offer → Exchange → Completion | — | ❌ **missing** |
| 9 | Portfolio / post-completion | — | ❌ **missing** |

Stages 8 and 9 do not exist in code. Stages 1, 5, 7 are partial.

---

## Stage 1 — Registration / Onboarding Gaps

The wizard collects: email/password, name/phone/UK address, budget min/max,
one of 4 strategies, cash/mortgage, free-text target areas, 4 agreement
checkboxes. That's it.

### Compliance & security gaps (HIGH severity)

| # | Gap | Impact |
|---|---|---|
| R1 | **No email verification** | Anyone can register with any email; combined with auto sign-in, an attacker can register *with someone else's email* and get an active session. |
| R2 | **No CAPTCHA or rate limiting on `/api/onboarding`** | Open to bot spam — creates real DB rows, real admin emails. |
| R3 | **Auto sign-in immediately after submit** | Attacker-controlled session before any verification. Pairs with R1 to make the issue real. |
| R4 | **No PEP / sanctions screening question** | UK MLR 2017 requires regulated firms to screen Politically Exposed Persons. Not asked. |
| R5 | **No nationality / tax residency / DOB / NI number** | Needed for AML, sanctions screening, stamp duty surcharge (non-residents pay +2%), and HMRC reporting. The "I am over 18" checkbox is unverifiable without DOB. |
| R6 | **No structured source-of-funds at registration** | Admin asks for *proof* at the KYC stage but never captures *the story* (savings / sale / inheritance / gift / business profits). |
| R7 | **Marketing consent fused with privacy consent** | UK GDPR & PECR require a separate explicit opt-in for marketing emails — currently a single checkbox covers privacy policy only. |
| R8 | **Weak password policy** | `min(8)` only — no complexity, no HIBP/breach check, no strength meter. |

### Data-model gaps (MEDIUM severity)

| # | Gap | Impact |
|---|---|---|
| R9 | **No company / SPV fields** | Most UK BTL investors buy via Ltd company. Schema has only an individual `InvestorProfile`. No CompanyName, CompanyNumber, directors. |
| R10 | **`targetAreas` is free text** | "Manchester, Leeds, Sheffield" stored as a string. Cannot query "show investors targeting Birmingham", cannot auto-match deals → investors. |
| R11 | **Strategy is single-select and naming-inconsistent** | Schema allows `Any`. Old `/api/register` and seed data use `All`. Investors typically pursue multiple strategies. Should be multi-select with a fixed lexicon. |
| R12 | **No experience level** | First-time buyer vs 20-property landlord need very different handholding. Not captured. |
| R13 | **No investment timeline / urgency** | "Buying in 30 days" vs "exploring for 12 months" totally changes admin prioritisation. Not captured. |
| R14 | **No mortgage detail when `buyerType = mortgage`** | Should capture: AIP status, lender, max LTV, deposit %, broker contact. None of it. |
| R15 | **No referral / attribution field** | No "how did you hear about us", no referral code. Marketing attribution lost. |
| R16 | **Address is single-line, UK-only, no validation** | No addressLine2, no country, no UK postcode regex, no Postcode-lookup / Places autocomplete. |
| R17 | **Phone validation is `min(7).max(50)`** | Accepts garbage. No E.164, no SMS-deliverability check. |

### UX gaps (LOW–MEDIUM)

| # | Gap | Impact |
|---|---|---|
| R18 | **No save/resume on the wizard** | Refresh = lose all state. No localStorage backup. |
| R19 | **Wizard lands the user on `/portal/status` with status SUBMITTED** | Page shows a timeline of one item and no next action. A "What happens next" landing page would set expectations. |
| R20 | **No profile-edit page in portal** | Once registered, investor cannot update phone, address, budget, target areas. Data goes stale fast. |
| R21 | **No password-change page** | Forgot-password works but no in-portal change. |
| R22 | **No account deletion / GDPR data export** | UK GDPR Articles 17 & 20 obligations not surfaced. |

### Dead code

| # | Gap | Impact |
|---|---|---|
| R23 | **`/api/register/route.ts` is legacy** | Old email-only flow with `'All'` strategy and `'Cash/Mortgage'` casing. Not called anywhere now that `/register` redirects to `/onboarding`. Delete it — schema mismatch is a footgun. |
| R24 | **`DRIVING_LICENCE` document type defined but unused** | Already flagged in handoff. |

---

## Stage 4–5 — KYC / Document Gaps

| # | Gap | Impact |
|---|---|---|
| K1 | **All-manual review** | No KYC provider integration (Onfido / SumSub / ComplyAdvantage). Admin opens each file, eyeballs it. Doesn't scale. |
| K2 | **No selfie / liveness check** | Most regulated KYC requires it. Document-only is "tier 1" KYC at best. |
| K3 | **No re-KYC reminders** | UK MLR requires refresh every 1–3 years; passport expiry; POA staleness (3-month rule). Nothing tracks this. |
| K4 | **`Document.reviewStatus` field exists but no UI** | Always stuck at PENDING. Admin has no "approve / reject this doc" action. |
| K5 | **No mechanism to request *additional* documents** | Admin can only ask via note in timeline; can't add a new upload slot dynamically. |
| K6 | **No client-side file size validation on upload** | Already flagged in handoff. |
| K7 | **`adminNotes` lives on `Application`, not per-document** | Notes about a specific document have no home. |

---

## Stage 6–7 — Deal Discovery & Response Gaps

| # | Gap | Impact |
|---|---|---|
| D1 | **Public `/deals` (Contentful) ↔ portal `/portal/deals` (DB) disconnected** | Logged-in investor browsing public deals cannot "save this one"; admin manually re-creates deals in portal. |
| D2 | **No favourites / shortlist / saved searches** | Pure inbound; investor cannot proactively express interest. |
| D3 | **Thin pre-offer deal context** | Admin posts only: title, address, asking price, summary. No photos, floorplan, EPC, tenure, rental appraisal, ROI/yield calc, comparables, area data, viewing dates. |
| D4 | **No viewing / appointment booking** | No "Request viewing" CTA. Schema doesn't model viewings or calls. |
| D5 | **`DealResponse` captures intent + free comment only** | A real offer has structure: amount, deposit %, financing source, target exchange date, conditions (subject to survey, sale of other property, etc.). |
| D6 | **`MORE_INFO` has no reply loop** | Investor's question lands in admin email; reply never appears tied to the deal. |
| D7 | **Messaging is application-scoped, not deal-scoped** | 3 active deals = 1 jumbled inbox. `Message.dealId` doesn't exist. |

---

## Stage 8 — Post-Acceptance (does not exist)

This is the **biggest gap in the whole platform**. Once an investor clicks
"Interested — let's proceed", the system records an intent and emails admin.
Everything after that — offer made → vendor accepted → memorandum of sale →
solicitor instructed → searches → survey → mortgage offer → exchange →
completion — happens entirely off-platform.

| # | Gap | Impact |
|---|---|---|
| T1 | **No per-deal transaction pipeline** | No equivalent of `StatusHistory` for the deal itself. Admin and investor have no shared view of where the transaction is. |
| T2 | **No structured offer terms** | (Same as D5 — listed here because it's blocking T1.) |
| T3 | **No per-deal document room** | Memo of sale, draft contract, searches, survey, mortgage offer, exchange contracts, completion statement — nowhere to live. |
| T4 | **No financial summary per deal** | Deposit paid, balance due, stamp duty estimate (incl. surcharges), legal fees — invisible. |
| T5 | **No deal-team handoff card** | After ACCEPT, buyer doesn't know who their named admin / solicitor / broker is. |

---

## Stage 9 — Portfolio / Post-Completion (does not exist)

| # | Gap | Impact |
|---|---|---|
| P1 | **No `/portal/properties`** | Platform forgets the buyer the moment the deal closes. Completion date, purchase price, rental income, tenancy status — no view. |
| P2 | **No documents archive per property** | Title deed, EPC, gas safety, EICR — all live in email. |
| P3 | **No portfolio-level metrics** | Total invested, total yield, total equity — not surfaced. |
| P4 | **Marketing promise vs reality mismatch** | Home page `HowItWorks` step 4 says "Complete & Build Portfolio" — the platform does not support either. |

---

## Cross-cutting / Platform Gaps

| # | Gap | Impact |
|---|---|---|
| X1 | **No 2FA on login** | Financial platform should have it as table-stakes. |
| X2 | **No account lockout / login activity log** | Brute-force friendly. No visibility for the user. |
| X3 | **No notifications centre in portal** | Investor only sees state if they navigate to a tab. No bell icon. |
| X4 | **No portal dashboard / overview** | Investor lands on Status. No summary card view aggregating Status + open Deals + unread Messages. |
| X5 | **Hardcoded `info@revebatir.co.uk`** | E.g. `src/app/api/portal/documents/submit/route.ts:69`. Should be `process.env.ADMIN_EMAIL`. Blocks multi-admin. |
| X6 | **No audit log** | `StatusHistory` covers KYC stage transitions only. Document views, message sends, deal responses — not audited. Compliance gap. |

---

## Recommended Phasing

### Phase 1 — Compliance / Security hardening (must-do before scaling)
- R1 email verification + R3 verify-before-sign-in
- R2 CAPTCHA + rate limit
- R4 PEP/sanctions question
- R5 nationality / DOB / tax residency
- R7 separate marketing consent
- R8 stronger password rules
- R23 delete legacy `/api/register`
- X1 2FA

### Phase 2 — Onboarding completeness
- R9 company / SPV fields
- R10 structured target areas (multi-select region/postcode-prefix)
- R11 strategy multi-select, fix `Any`/`All` mismatch
- R12 experience level + R13 timeline + R14 mortgage detail
- R16 address with postcode lookup
- R20 profile-edit page + R21 password change

### Phase 3 — Deal Transaction phase (the post-acceptance loop)
Bundle T1 + T2 + T3 + D6 + D7 as one cohesive "Deal Transaction"
feature:
- `Deal.stage` + `DealStageHistory` (mirrors `StatusHistory` pattern)
- `Offer` model (amount, deposit %, financing, target date, conditions)
- `DealDocument` model (per-deal file room)
- `Message.dealId` (per-deal thread)
- `/portal/deals/[id]` detail page becomes buyer's home for everything post-acceptance

### Phase 4 — Deal context + matching
- D1 + D2 public ↔ portal bridge, favourites
- D3 richer deal cards (photos, floorplan, EPC, ROI calc)
- D4 viewing booking
- Auto-match: structured `targetAreas` (from R10) + `strategy` enables admin to query "all investors who match this deal"

### Phase 5 — Post-completion / portfolio
- P1–P3 properties view, document archive, portfolio metrics
- Aligns marketing promise (`HowItWorks` step 4) with delivered product

### Phase 6 — KYC modernisation
- K1 KYC provider integration
- K2 selfie/liveness
- K3 expiry/refresh reminders
- K4 doc-level review actions

---

## Top 3 Recommended Next Actions

1. **Compliance fix bundle** (R1, R2, R3, R4, R5, R7, R23). Small individually, blocking individually, ~1-2 days together. Eliminates the worst security and AML gaps.
2. **Phase 3 (Deal Transaction)** spec + plan. Highest user-value unlock; closes the loop that the platform's own homepage promises.
3. **Structured `targetAreas` + strategy multi-select** (R10, R11). One small migration that unlocks deal-to-investor matching — the foundation of the platform's value proposition.
