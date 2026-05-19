# Obsidian Log

Append-only record of vault updates.

## [2026-05-19] handoff | New session prompt written

- Created: `obsidian/Knowledge/2026-05-19-handoff-prompt.md`
- Updated: `obsidian/index.md`
- Summary of the session: 8 PRs, 15 commits, audit close-out (26 of 29), all 5 subscription workflow plan items live, weekly cron operational + verified, three schema migrations
- Pending external setup carried forward: Turnstile, SumSub, getaddress.io, Rêve Bâtir bank/pricing env vars on Azure SWA
- CRON_SECRET ✅ set + verified end-to-end during this session
- Phase 6.8 Passkeys is still the only outstanding pre-audit gap-analysis item

## [2026-05-19] feature | PR #8 — Schema-blocked audit items (C6 + L1 + M1)

- Created: `obsidian/Projects/2026-05-19-pr8-schema-blocked-items.md`
- Updated: `obsidian/index.md`
- Azure SQL firewall whitelisted via `az sql server firewall-rule create` for IP 154.161.38.129 (rule name: claude-session-may19; resource group: gbhlogistics; SQL server: gmxserver)
- Schema pushes (2x): added `InvoiceCounter` model + dropped `Invoice.pdfBlobPath` + added `Document.supersededAt`
- **C6**: `nextInvoiceNumber` now uses `prisma.invoiceCounter.upsert({ where: {prefix}, create: {prefix, seq: 1}, update: { seq: { increment: 1 } } })` — atomic at the DB level. No more race + retry surface. Numbering is monotonic (VOIDed numbers stay used — proper accounting).
- **L1**: dropped `Invoice.pdfBlobPath` schema field (was never written; PDFs render on-demand).
- **M1**: `Document.supersededAt` added; PoF replace now uses `updateMany({supersededAt: now})` instead of `deleteMany`, blob intentionally preserved for AML evidence chain. `hasActiveProofOfFunds` + `getMostRecentProofOfFunds` filter `supersededAt: null`.
- Tests: rewrote `nextInvoiceNumber` test block for counter approach; added `invoiceCounter.upsert` mock to invoices + subscriptions test prisma mocks; removed leftover `mockResolvedValueOnce(null)` queue that was bleeding across tests. 374/374 pass; build clean.
- **Audit close-out: 26 of 29 items**. Remaining 3 are cosmetic (M5), verified safe (M8), or user-owned (L3).

## [2026-05-19] polish | PR #7 — Audit batch (M2, M3, M4, M6, M9, L4, L5, L7)

- Created: `obsidian/Projects/2026-05-19-pr7-audit-polish-medium-low.md`
- Updated: `obsidian/index.md`
- **M2**: renewals idempotency window = `period === 'ANNUAL' ? 350 : 25` days (was hardcoded 25)
- **M3**: Property.purchasePrice now passes Prisma.Decimal through instead of round-tripping via Number()
- **M4**: success-fee suggestion uses `deal.offer?.amount` when offer is ACCEPTED, falls back to askingPrice. Description string updated.
- **M6**: /api/portal/messages POST body capped at 5000 chars (matches per-deal messages route)
- **M9**: DealResponse DELETE returns 409 OFFER_ACTIVE if PENDING/ACCEPTED offer exists. Migrated to getInvestorDeal for tier-gate consistency.
- **L4**: `[config] KEY unset — using default "X"` warn-once on cold start for missing REVE_BATIR_SUCCESS_FEE_PCT, REVE_BATIR_PREMIUM_MONTHLY/ANNUAL, REVE_BATIR_BANK_NAME/SORT_CODE/ACCOUNT/ACCOUNT_NAME. Server-side only.
- **L5**: 7 new audit action codes (INVOICE_ISSUED/MARKED_PAID/VOIDED/DELETED + SUBSCRIPTION_ACTIVATED/CANCELLED/RENEWAL_RUN); wired into 6 admin routes. Cron-triggered renewal runs record actorRole='cron'. Dry-runs skip audit (preview only).
- **L7**: new `deleteBlob` helper in azure-blob.ts (deleteIfExists, non-fatal). Wired into: DealDocument DELETE, PropertyDocument DELETE, /api/portal/proof-of-funds replace, /api/portal/documents replace. Closes blob-orphan cost leak.
- Tests: +5 (DELETE-response M9 cases) + C7 test mock extended for new audit metadata. 373/373 pass; build clean.
- Audit close-out: 13 of 22 critical/high/medium/low items now closed. Open: C6 (firewall), M1 (PoF audit trail needs schema), M5 (cosmetic cache header), L1 (drop unused field, needs schema), L3 (untracked user files).

## [2026-05-19] feature | PR #6 — Subscription completion (B1 + B2 + C1)

- Created: `obsidian/Projects/2026-05-19-pr6-subscription-b1-b2-c1.md`
- Updated: `obsidian/index.md`
- **C1**: generate-renewals endpoint now accepts EITHER admin session OR Bearer `CRON_SECRET` header. New `.github/workflows/weekly-renewals.yml` runs Mon 09:00 UTC + `workflow_dispatch` for manual ad-hoc with horizon + dryRun inputs. Curl with HTTP-status check; summary written to GitHub Step Summary. Required secrets: `CRON_SECRET` (both Azure SWA env + GitHub repo secret) + `RENEWALS_ENDPOINT` (GitHub).
- **B2**: `?userIds=u1,u2,u3` filter on generate-renewals; UI gains a checkbox per subscriber in the dry-run preview (all checked by default, Select/Deselect-all toggle, "Send N invoices" reflects selection count).
- **B1**: new `POST /api/portal/subscription/request` (UPGRADE | CHANGE_MONTHLY | CHANGE_ANNUAL | CANCEL + optional reason); creates an in-portal Message, notifies all admins, emails RESEND_TO_EMAIL. `SUBSCRIPTION_REQUEST` notification type added. New `SubscriptionRequestForm` client component shown on `/portal/subscription` — FREE tier sees only UPGRADE; PREMIUM uncancelled sees the change/cancel set.
- Tests: +12 (7 subscription-request, 5 generate-renewals C1+B2 cases); 368/368 pass; build clean
- Setup checklist for cron in the PR note
- All 5 subscription workflow plan items now shipped (A1, A2, B1, B2, C1)

## [2026-05-19] feature | PR #5 — Subscription polish A1 + A2

- Created: `obsidian/Projects/2026-05-19-pr5-subscription-polish-a1-a2.md`
- Updated: `obsidian/index.md`
- **A1**: `POST /api/admin/subscriptions/generate-renewals` accepts `?dryRun=true`; response includes `investorName` + `userEmail` per entry. New `src/components/admin/RenewalGeneratorButton.tsx` with horizon input + Preview + Send flow. New `/admin/subscriptions` page with MRR stat, active subscriber table (sorted by renewal date, overdue rows in red), cancelled list, recent SUBSCRIPTION invoices. Admin nav link added.
- **A2**: `POST /api/admin/subscriptions/[userId]` now preserves `nextRenewalAt` when reactivating a cancelled-but-still-paid-up sub or changing plan mid-period. Fresh period only when prior expired or no subscription. Removes refund/trust risk.
- Tests: +11 (4 A2 cases, 5 A1 cases, 2 housekeeping for renewal mock setup); 356/356 pass; build clean
- Adopted `NextRequest` from `next/server` for tests that need `req.nextUrl.searchParams` parsing

## [2026-05-19] knowledge | Subscription workflow doc + implementation plan

- Created: `obsidian/Knowledge/2026-05-19-subscription-workflow.md`
- Updated: `obsidian/index.md` — added entry
- End-to-end documentation of the 5 subscription workflows (upgrade, downgrade, plan-change, renewal, investor-side view)
- Effective-tier truth table for the C7 fix (stored intent vs runtime effective tier)
- Code surface map: subscriptions.ts, deal-access.ts, /api/admin/subscriptions/[userId], /api/admin/subscriptions/generate-renewals, SubscriptionPanel, /portal/subscription
- 5 gaps identified, sequenced as Phase A (no-schema quick wins ~1.5h), Phase B (UX completeness ~1d), Phase C (cron, deferred)
  - A1 admin button for "Generate renewals" + dry-run (~30 min, HIGH leverage)
  - A2 plan-change preserves in-period nextRenewalAt (~1h, fixes refund risk)
  - B1 investor-side request flow via Messages (~½d)
  - B2 per-investor selective billing (~½d, only if needed)
  - C1 Azure Functions cron (deferred until subscriber count justifies)
- Recommendation: A1 + A2 ship together as a single ~1.5h PR

## [2026-05-19] feature | PR #4 — Audit hardening (H1, H2, H4, H8)

- Created: `obsidian/Projects/2026-05-19-pr4-audit-hardening.md`
- Updated: `obsidian/index.md`
- **H1**: NextAuth session callback (Node-side `auth.ts`) now re-queries `User.deletedAt` on every server-side `auth()` call; returns session with `user: undefined` when the user is deleted, short-circuiting all "if !session?.user return 401" checks. Defence-in-depth helper `getActiveSession()` added too. Middleware unaffected (still uses edge-safe `authConfig`).
- **H4**: `STAGE_TRANSITIONS` matrix in `src/lib/deal-stages.ts`. `canStageTransition(from, to, { override })` helper. Stage PATCH route returns 409 `INVALID_STAGE_TRANSITION` for invalid moves; `override: true` bypasses but requires `overrideReason` (400 otherwise), prepended to history note as `[OVERRIDE] reason`.
- **H2**: Stage PATCH route now refuses to roll back FROM `COMPLETED` if a Property exists (409 `PROPERTY_EXISTS` with `propertyId`). New admin DELETE endpoint `/api/admin/properties/[propertyId]` for cleanup, with `PROPERTY_DELETED` audit event.
- **H8**: `paidReference` on invoice PATCH now validated against `/^[A-Za-z0-9 _\-/.,]{1,255}$/`. New `escapeHtml(value)` helper in `src/lib/html-escape.ts` applied to all admin/investor-controlled interpolations in email templates (invoice receipt, invoice sent, deal stage change, offer decision).
- Audit: 2 new action codes (`PROPERTY_DELETED`, `STAGE_OVERRIDE`).
- Tests: +30 (`deal-stages` lib 14, `html-escape` lib 5, `deal-stage` API 6, `invoices` API 3 + 2 helper); 345/345 pass; build clean
- **C6 deferred**: `InvoiceCounter` model added to schema.prisma but `prisma db push` failed — Azure SQL firewall blocks current IP (154.161.38.129). Will land as separate commit once firewall rule added.

## [2026-05-19] feature | PR #3 — Counter-offer flow after vendor REJECTED (audit followup)

- Created: `obsidian/Projects/2026-05-19-pr3-counter-offer-flow.md`
- Updated: `obsidian/index.md`
- Closes **C8**: vendor REJECTED previously hard-jumped to FALLEN_THROUGH (terminal), blocking the common counter-offer flow.
- Backend:
  - `offer-decision/route.ts`: REJECTED → stage = PROPOSED (was FALLEN_THROUGH); updated notification + email copy to invite revised offer
  - `offer/route.ts` POST: status-aware branching — PENDING blocks with "use PATCH", ACCEPTED blocks ("no revisions"), REJECTED/WITHDRAWN allows replacement via delete-old + create-new in single transaction; audit trail in DealStageHistory note
- Frontend:
  - `OfferForm.tsx`: new isUpdatable/isReplaceable discriminators; REJECTED/WITHDRAWN shows prior summary + "Submit revised offer" CTA; submit button text reflects flow ("Update", "Submit Revised", "Submit")
  - Form pre-populates with prior offer values so investor only needs to tweak amount
- Schema unchanged — Offer.dealId @unique preserved via delete-in-transaction
- Tests: +4 (PENDING-409, ACCEPTED-409, REJECTED-replaces, REJECTED-stage-to-PROPOSED); 315/315 pass
- Build clean
- Audit close-out: 3 PRs landed (PR #1 C3+C4+C5+C7+H6+H7, PR #2 C1+L2, PR #3 C8). Remaining open: C6 invoice race, H1 deletedAt JWT, H2 property cleanup, H4 transition matrix, M+L backlog

## [2026-05-19] feature | PR #2 — Centralised deal access with tier gate (audit followup)

- Created: `obsidian/Projects/2026-05-19-pr2-deal-access-helper.md`
- Updated: `obsidian/index.md`
- Closes **C1** (subresource APIs ignored Premium tier gate — Premium was UI-only) and **L2** (duplicated `getDealForUser` across 5+ routes).
- New `src/lib/deal-access.ts` exports `getInvestorDeal` (tier-gated, scoped to user's application), `getAdminDeal` (no constraints), `getDealForViewer` (role-aware shortcut).
- 7 portal subresource routes migrated to the helper: offer, response, viewings, documents (list + per-doc URL/DELETE), messages, favourite. ~80 LoC deduplicated.
- Favourite endpoint is now tier-gated (was previously bypassable for FREE users).
- New tests: `tests/lib/deal-access.test.ts` (10). Migrated 5 existing test suites (offer, viewing, response, deal-messages, favourite-interest) to mock the helper rather than prisma directly.
- 311/311 pass; build clean
- Next: PR #3 (C8 — REJECTED → counter-offer flow)

## [2026-05-19] feature | PR #1 — Phase 7 leak plugs (audit followup)

- Created: `obsidian/Projects/2026-05-19-pr1-phase7-leak-plugs.md`
- Updated: `obsidian/index.md` — added entry
- Fixes 5 audit findings:
  - **C5** `batch-post` now sets `publishedAt = new Date()` — Premium 48h gate fully functional on primary deal-distribution path again
  - **C4** offer POST requires `DealResponse.intent === 'ACCEPT'` (server enforces what UI gates on) — returns 409 `RESPONSE_REQUIRED`
  - **C3** PoF gate copied from offer POST to offer PATCH (prevents stale-PoF amount-raise bypass)
  - **C7** subscription DELETE preserves `User.tier` until period ends; new `effectiveTier(user, now)` helper computes runtime tier from intent + subscription state; updated tier-gate call sites in `/api/portal/deals`, `/portal/deals`, `/portal/deals/[dealId]`, `/portal/subscription`
  - **H6/H7** P2002 caught on Offer + Response create races → friendly 409 instead of 500
- New tests: `tests/api/response.test.ts` (5), `tests/api/subscriptions.test.ts` (4), `effectiveTier` block in `tests/lib/subscriptions.test.ts` (6), updated `tests/api/offer.test.ts` (+4 cases)
- 301/301 tests pass; build clean
- Next: PR #2 (centralize getDealForUser with tier filter) then PR #3 (C8 counter-offer flow)

## [2026-05-18] audit | Deal-package workflow — security + correctness review

- Created: `obsidian/Knowledge/2026-05-18-deal-workflow-audit.md`
- Updated: `obsidian/index.md` — added Knowledge entry
- Dispatched a thorough general-purpose audit agent covering 22+ files in the deal lifecycle + cross-cutting gates (PoF, Premium tier, auth)
- Findings: 8 CRITICAL, 5 HIGH, 8 MEDIUM, 7 LOW
- Self-verified the top 5 criticals (C1/C4/C5/C7/C8) against actual code — all confirmed true
- **Top three to fix first**:
  - C5: batch-post omits `publishedAt` → Premium 48h gate silently off for primary deal-distribution path
  - C1: subresource APIs (offer/viewings/response/messages/docs/favourite) ignore tier gate → Premium gate is UI-only, bypassable via curl
  - C7: subscription cancellation immediately demotes `User.tier` → refund liability when user cancels mid-period (also contradicts the schema comment I wrote)
- Notable correctness issues: C4 offer-without-ACCEPT (state machine pollution), C8 vendor-REJECTED auto-FALLEN_THROUGH (UX deadlock for revised offers)
- Quick-win batch: C5 + C4 + C3 + C7 + H6/H7 can land in one PR (~2-3 hrs)
- Architectural fix: centralize getDealForUser in `src/lib/deal-access.ts` with built-in tier+visibility filter (fixes C1 + L2 together, ~½ day)
- Not committed yet — audit findings only

## [2026-05-17] note | Azure SWA deploy "failure" on becd637 was a benign cancellation

- Symptom: GitHub Actions shows ❌ on the becd637 (7B) run.
- Cause: deploy was canceled mid-poll because the next commit (7226ac3, docs log update) landed 42 seconds later on the same branch. SWA cancels in-flight deploys when a newer commit arrives.
- Log message: `Deployment Failure Reason: Deployment Canceled`
- Outcome: 7226ac3 includes all of 7B code + the doc line, and its deploy succeeded. Site has the full Phase 7B code.
- Lesson for future: avoid back-to-back pushes within ~1 minute on master, OR expect to see a cancel marker on the older one (cosmetic only).

## [2026-05-17] ship | Phase 7B committed + pushed (commit becd637)

- 36 files / +2931 lines committed as `feat: Reve Batir invoicing + Premium tier (Phase 7B)`
- Pushed to origin/master — Azure SWA deploy triggered
- Schema migration already applied to Azure SQL pre-push (db push 7.31s)
- Phase 7 complete (all four tasks shipped across two commits: 86340a4 + becd637)
- Open follow-ups: env-var setup for bank details + premium pricing on Azure SWA; admin matching premium chip; session-tier propagation; email delay hint for FREE tier

## [2026-05-17] feature | Tasks 7.3 + 7.4 — Rêve Bâtir invoicing + Premium subscription tier (Phase 7B)

- Created: `obsidian/Projects/2026-05-17-task-7-3-invoicing.md`
- Created: `obsidian/Projects/2026-05-17-task-7-4-premium-tier.md`
- Updated: `obsidian/index.md` — added both task entries
- Schema (Azure SQL push 7.31s): `Invoice` model (RB-YYYY-NNNN), `Subscription` model (MONTHLY/ANNUAL renewal), `User.tier` (FREE/PREMIUM), `Deal.publishedAt` (nullable, drives 48h gate)
- Dep: `@react-pdf/renderer` (server-side PDF, no headless browser)
- **Task 7.3**: full invoice lifecycle — admin issues sourcing (manual amount) + success (auto-suggested `askingPrice × env.SUCCESS_FEE_PCT`), DRAFT→SENT→PAID workflow with bank-reference capture on PAID, on-demand A4 PDF with brand styling + bank details, investor /portal/invoices list with outstanding/overdue banner, admin /admin/investors/[id]/invoices list with mark-paid/void actions, deal-page quick-action buttons that disappear once invoice of that type exists (no double-billing).
- **Task 7.4**: Premium tier with 48h head start on new deals — admin SubscriptionPanel embeds in investor page (Activate/Change/Cancel), investor /portal/subscription with Monthly/Annual pricing display, manual renewal-invoice generator (`POST /api/admin/subscriptions/generate-renewals?days=7`, idempotent). FREE-tier deal-list filtered + upgrade banner shows count of hidden Premium-only previews. Detail-page redirect back to list if deal still in 48h window.
- Code structure: `src/lib/invoices.ts` is now Prisma-free (browser-safe for client components); `nextInvoiceNumber` moved to `src/lib/invoice-numbering.ts` (server-only). Fixes mssql-in-browser bundle issue.
- Tests: +53 (15 invoices lib, 12 invoice API, 15 subscriptions lib, 8 deal-visibility, +3 from existing tests updated for new mocks); 282/282 pass
- Build: clean — new routes `/portal/invoices`, `/portal/subscription`, `/admin/investors/[id]/invoices`, `/api/admin/invoices*`, `/api/admin/subscriptions*`, `/api/portal/invoices*`
- Env vars added (all have safe defaults): `REVE_BATIR_SUCCESS_FEE_PCT`, `REVE_BATIR_PREMIUM_MONTHLY`, `REVE_BATIR_PREMIUM_ANNUAL`, `REVE_BATIR_BANK_NAME/SORT_CODE/ACCOUNT/ACCOUNT_NAME`, `REVE_BATIR_VAT_NUMBER`
- Deferred: admin matching premium chip (matching UI doesn't yet show tier — easy follow-up); session.user.tier propagation (currently each gated query reads `User.tier` from DB)

## [2026-05-17] ship | Phase 7A committed + pushed (commit 86340a4)

- 17 files / +1119 lines committed as `feat: post-viewing handoff + proof-of-funds gate (Phase 7A)`
- Pushed to origin/master — Azure SWA deploy triggered
- `prisma.config.ts` and `scripts/check-data.ts` left as pre-existing untracked (not part of 7A scope)
- Next: Task 7.3 schema (Invoice + Subscription + User.tier + Deal.publishedAt) on Azure SQL

## [2026-05-17] feature | Tasks 7.1 + 7.2 — Post-viewing handoff + Proof-of-funds gate (Phase 7A)

- Created: `obsidian/Projects/2026-05-17-task-7-1-post-viewing-handoff.md`
- Created: `obsidian/Projects/2026-05-17-task-7-2-proof-of-funds-gate.md`
- Updated: `obsidian/index.md` — added both task entries
- **Task 7.1**: ViewingPanel gains `AdminCompleteOrCancel` for CONFIRMED state (Mark as completed / Cancel viewing); new `PostViewingPrompt` banner above OfferForm with smooth-scroll-to-offer button; investor deal page now queries `viewings` and renders prompt when intent=ACCEPT + recent viewing + no offer yet. Scope reduced: discovered offer POST already auto-advances PROPOSED→OFFER_PENDING (no admin banner needed).
- **Task 7.2**: New `src/lib/proof-of-funds.ts` (6-month freshness, helpers), new `POST /api/portal/proof-of-funds` upload route (works regardless of app status, replaces existing), server-side `POF_REQUIRED` gate on viewing-request + offer-submit endpoints, new `ProofOfFundsGate` UI banner with stale-doc messaging.
- Tests: +16 (10 PoF lib, 5 viewing POST incl. PoF gate, 1 offer PoF gate); 229/229 pass
- Build: clean — new `/api/portal/proof-of-funds` route compiled
- No schema changes (Document.type was free-string already — `PROOF_OF_FUNDS` is a new value)
- Next: commit + push 7A, then start Task 7.3 (Invoice + Subscription schema)

## [2026-05-17] plan | Phase 7 — Post-viewing handoff + Rêve Bâtir invoicing

- Created: `obsidian/Projects/2026-05-17-phase-7-plan.md`
- Updated: `obsidian/index.md` — added Phase 7 plan entry
- Sequence locked (per owner):
  - **7A** ships first (no schema): Task 7.1 post-viewing handoff + Task 7.2 PoF gate
  - **7B** ships second (schema migration): Task 7.3 Invoice model (admin issue / investor view / PDF) + Task 7.4 Subscription + Premium tier (48h preview gate, manual renewal generator)
- Schema sketched: Invoice (RB-YYYY-NNNN, DRAFT→SENT→PAID→VOID, bank reference, PDF blob), Subscription (monthly/annual, nextRenewalAt), User.tier (FREE|PREMIUM), Deal.publishedAt
- Env vars added to setup checklist: REVE_BATIR_SUCCESS_FEE_PCT, REVE_BATIR_PREMIUM_MONTHLY|ANNUAL, bank details for PDF
- TodoWrite seeded with 13 tasks across both slices
- Next: start Task 7.1 (post-viewing handoff) — ViewingPanel + investor offer-prompt card + admin auto-stage banner

## [2026-05-17] decision | Solicitor-only money flow + Rêve Bâtir invoices (sourcing/success/subscription)

- Updated: `obsidian/Knowledge/2026-05-17-post-viewing-flow-and-money-handling.md` — added "Product decisions (locked)" header + revised plan
- Updated: `obsidian/index.md` — refreshed summary
- Owner decided: (1) no Stripe/GoCardless — all conveyancing money via solicitor client accounts; (2) Rêve Bâtir charges sourcing + success + subscription fees, so Invoice model is required scope (not optional).
- Phase 7 proposed: post-viewing handoff (~1d) → proof-of-funds gate (~½d) → Invoice model + admin/investor UI + PDF (~2-3d) → Subscription recurring engine (~1-2d)
- Out: reservation-fee capture, payment processor integration
- Blocked on: 4 structural questions (subscription tier, sourcing fee shape, success fee shape, per-investor overrides) — asked owner next

## [2026-05-17] query | Post-viewing flow & money handling — gap analysis

- Created: `obsidian/Knowledge/2026-05-17-post-viewing-flow-and-money-handling.md`
- Updated: `obsidian/index.md` — added Knowledge entry
- Question from owner: what happens after viewing CONFIRMED, and where do money transactions live?
- Findings:
  - **Gap A — post-viewing dead-zone**: viewing CONFIRMED → silence. `ViewingPanel` AdminDecide controls only render for REQUESTED. No prompt to investor to make an offer. No link between Viewing.status and Deal.stage advancement. Offer submission doesn't auto-advance stage. Biggest UX cliff in journey.
  - **Gap B — no money handling**: no Stripe/payments anywhere. `Offer.depositPercent` is commitment-only, `FinancialSummary` is a calculator. All cash flows off-platform via solicitors. Missing: reservation/holding fee, Rêve Bâtir's own invoicing, proof-of-funds gate.
- Recommendation: tackle Gap A (~1 day, no money risk) before any payment work. Two product decisions needed: (1) does the platform take money? (2) are there Rêve Bâtir fees?
- Source files: `prisma/schema.prisma:286-301` (Viewing), `src/lib/deal-stages.ts`, viewing API routes, ViewingPanel, FinancialSummary, OfferForm

## [2026-05-17] feature | Tasks 3.1 + 3.7 — Deal pipeline + deal-team handoff (Phase 3 kickoff)

- Schema: Deal.stage (default PROPOSED), Deal.dealLeadUserId / solicitorContact / brokerContact; new DealStageHistory model — pushed (9.75s)
- Lib: `src/lib/deal-stages.ts` — 10 canonical stages (PROPOSED → OFFER_PENDING → OFFER_ACCEPTED → MEMO_OF_SALE → CONVEYANCING → SURVEY → MORTGAGE → EXCHANGED → COMPLETED, + FALLEN_THROUGH terminal failure)
- API: PATCH /api/admin/deals/[dealId]/stage — admin-only, validates stage, writes DealStageHistory entry on change, emails investor on transition
- Admin: new /admin/investors/[id]/deals/[dealId] detail page — 2-column layout, pipeline timeline + investor response panel + DealStagePanel form (stage select + note + lead admin select + solicitor/broker free-text)
- Deals list now shows stage label + links to detail page
- Investor: new /portal/deals/[dealId] page — current-stage card, pipeline timeline with timestamps + admin notes, "Your Deal Team" card (lead contact / solicitor / broker), original summary at bottom
- DealCard gets a stage banner once stage moves past PROPOSED with "View Pipeline →" link
- Closes T1 (per-deal pipeline) + T5 (deal-team handoff card) — the biggest single user-value unlock from the gap analysis
- Tests: +6 (auth, role, stage validity, deal-not-found, stage change, team-only update); 135/135 pass
- Build: clean

## [2026-05-17] feature | Task 2.10 — GDPR data export + account deletion

- Schema: User.deletedAt DateTime? — pushed
- Auth: NextAuth authorize() rejects users with deletedAt set; logs reason `deleted`
- API: GET /api/portal/data-export — returns downloadable JSON of all personal records (account, profile, application, status history, docs, messages, deals, last 100 login attempts); excludes secrets (passwordHash, totpSecret)
- API: POST /api/portal/account/delete — requires password + literal "DELETE" confirmation; soft-deletes by anonymising User + InvestorProfile (preserves audit-required records for UK MLR 7-year retention); clears tokens + 2FA + recovery codes; signs user out
- Admin accounts cannot self-delete (403)
- UI: DataAndDeletion component on /portal/security with "Download my data" link + danger-styled delete flow
- Tests: +7 (delete: auth/confirm/admin-block/wrong-password; export: 401/404/success); 129/129 pass
- Build: clean
- Closes R22

## [2026-05-17] feature | Task 2.3 — Buyer entity / SPV support

- Schema: +5 fields on InvestorProfile (entityType, companyName, companyNumber, vatNumber, companyAddress) — entityType defaults to INDIVIDUAL — pushed (4.50s)
- 4 entity types: INDIVIDUAL | LTD_COMPANY | LLP | TRUST
- Lib: ENTITY_TYPES catalog + COMPANY_NUMBER_REGEX (8 digits OR 2 letters + 6 digits, e.g. SC123456 / NI123456) + helpers
- UI: StepPersonal now starts with "Buying as" select; when non-individual, shows bordered Entity Details panel (company name, Companies House number, VAT number, registered address); personal block reframed as "lead contact / director"
- Zod: cross-field refines — company name required for non-individual, Companies House number must match regex when provided for LTD_COMPANY
- API: persists all 5 fields; nullifies them for INDIVIDUAL; normalises company/VAT numbers to uppercase no-whitespace
- Admin: investor name header now shows entity-type chip + company name + #number + VAT (if non-individual)
- Tests: +4 (Ltd with valid number, Scottish prefix, missing name rejected, malformed number rejected); 122/122 pass
- Build: clean
- Closes R9

## [2026-05-17] feature | Task 2.7 — Wizard save/resume

- localStorage key `rb-onboarding-draft-v1` — saves step + personal/compliance/criteria/agreements + email hint
- Never saves password (security)
- Restore on mount via useEffect; capped at step 3 so user re-acknowledges agreements on Review
- "We restored your previous application" gold banner with "start over" link to discard and dismiss button
- Cleared on successful submit
- Hydration guard prevents clobber on initial load
- Build: clean
- Closes R18

## [2026-05-17] feature | Task 2.11 — Welcome landing page

- New /portal/welcome page — 4-card "What happens next" explainer (review → KYC → activation → deals)
- Login page detects ?verified=1 query param and routes just-verified users to /portal/welcome instead of /portal/status
- Two CTAs: Continue to portal + Review my profile
- No schema changes — uses existing verify-on-login flow signal
- Build: clean
- Closes R19

## [2026-05-17] feature | Task 2.8 — Profile-edit page

- API: GET + PATCH /api/portal/profile (Zod-validated subset)
- Schema: `src/lib/schemas/profile.ts` profileUpdateSchema — all editable fields + cross-field refines (budget, mortgage, NI, source-of-funds)
- Locked (admin-edit only): firstName, lastName, dateOfBirth, nationality, isPep — surfaced read-only with explainer
- Page: /portal/profile with sectioned form (Identity / Contact / Investment Criteria / Experience & Funding / Tax & Source / Communication)
- Replaces structuredAreas + strategies atomically within transaction (deleteMany + createMany)
- E.164 normalisation on phone, NI uppercase + whitespace-strip, marketing consent timestamp preserved if previously granted
- Legacy compliance flag set true on first save — closes the legacy-account gap
- Banner shown on /portal/profile when complianceCompleted=false
- Profile tab added to portal nav
- Tests: +7 (auth, valid, invalid, not-found, mortgage refine, GET 401/404); 118/118 pass
- Build: clean
- Closes R20

## [2026-05-17] feature | Task 2.9 — Password change page in portal

- API: POST /api/portal/password/change — requires current password, rejects same-as-new, applies full complexity rules + HIBP breach check, bcrypt(12)
- UI: PasswordChangeForm on /portal/security (below 2FA section), strength meter, confirm field
- Tests: +4 (auth gate, same-as-new, weak password, wrong current); 111/111 pass
- Build: clean
- Closes R21

## [2026-05-17] feature | Task 2.6 — E.164 phone validation

- Created: `obsidian/Projects/2026-05-17-task-2-6-phone-e164.md`
- Dep: libphonenumber-js
- Zod: isValidPhoneNumber(_, 'GB') refine on stepPersonalSchema + onboardingSubmitSchema
- API: parsePhoneNumber normalises to E.164 (`+447911123456`) before bcrypt + DB write
- Library correctly rejects the UK fiction-only 7700-9xxxxxx range
- Tests: +4 (national, E.164, garbage, too short); 107/107 pass
- Build: clean
- Closes R17

## [2026-05-17] feature | Task 2.4 — Experience, timeline, mortgage, referral

- Created: `obsidian/Projects/2026-05-17-task-2-4-experience-funding.md`
- Schema: +7 fields on InvestorProfile (experienceLevel, timelineToBuy, mortgageStatus, mortgageLender, maxLtv, depositAvailable, referralSource) — all nullable; pushed (4.55s)
- Lib: 3 new option lists + label helpers in compliance.ts
- Zod: 7 fields added to stepCriteriaSchema + onboardingSubmitSchema; cross-field refine forces mortgageStatus when buyerType=mortgage
- UI: StepCriteria extended (no new wizard step) — required selects for experience/timeline, optional referral text, conditional bordered mortgage panel (status/lender/LTV/deposit) when buyerType=mortgage
- API: persists all fields; nullifies mortgage fields for cash buyers
- Admin: new "Experience & Funding" panel below Compliance
- Tests: +1 (mortgage status required); 103/103 pass
- Build: clean
- Closes R12+R13+R14+R15

## [2026-05-17] feature | Task 2.2 — Multi-select strategy + Any/All fix

- Created: `obsidian/Projects/2026-05-17-task-2-2-multi-select-strategy.md`
- Schema: new InvestorStrategy model (investorProfileId, strategy) with @@unique([id, strategy]) + @@index — pushed (5.25s); legacy InvestorProfile.strategy preserved (mirrors first selection)
- Lib: `src/lib/strategies.ts` — 5 canonical codes (BTL/HMO/FLIP/COMMERCIAL/SERVICED_ACCOM), VALID_STRATEGY_CODES, strategyLabel(), legacyToStrategies() mapper (Any/All → all 5)
- UI: StepCriteria replaces dropdown with 5-row checkbox group (each with label + description); min 1 enforced
- API: investorStrategy.createMany in transaction; legacy strategy String mirrored from first selection
- Admin: chip display + legacyToStrategies fallback for old accounts
- Tests: +9 (7 strategies lib, 2 schema); 102/102 pass
- Build: clean
- Closes R11 — completes matching-data layer alongside 2.1; Phase 4 auto-match query is now trivial

## [2026-05-17] feature | Task 2.1 — Structured target areas (Phase 2 kickoff)

- Created: `obsidian/Projects/2026-05-17-task-2-1-structured-target-areas.md`
- Schema: new TargetArea model (investorProfileId, code, label) with @@unique([id, code]) + @@index(code) — pushed (5.14s); legacy InvestorProfile.targetAreas preserved
- Lib: `src/lib/target-areas.ts` — 54 curated UK areas across 7 groups (London zones, NW, Yorkshire & NE, Midlands, S & SW, Wales, Scotland, NI)
- UI: new TargetAreaPicker — selected chips at top, search input, grouped checkbox list with sticky headers
- Wizard: StepCriteria replaces text input with picker, switches state to targetAreaCodes[]
- Review + admin: chip display of selected areas (admin falls back to legacy string for old accounts)
- API: targetArea.createMany within the onboarding transaction; legacy targetAreas string mirrored with joined labels
- Zod: targetAreaCodes array with min 1, max 50, valid-codes refine
- Tests: +5 for target-areas catalog; fixtures updated; 93/93 pass
- Build: clean
- Closes R10 — unlocks Phase 4 auto-matching

## [2026-05-17] feature | Task 1.4 — AML data capture + admin Compliance panel

- Created: `obsidian/Projects/2026-05-17-task-1-4-aml-data.md`
- Schema: 9 new fields on InvestorProfile (dateOfBirth, nationality, taxResidency, niNumber, isPep, pepDetails, sourceOfFunds, sourceOfFundsDetail, complianceCompleted) — all nullable for backwards compat — pushed to Azure SQL (6.25s)
- Lib: `src/lib/compliance.ts` — COUNTRIES (29 common+OT), SOURCE_OF_FUNDS_OPTIONS (8 values), NI_NUMBER_REGEX, ageOn(), looksLikeNiNumber()
- Zod: new stepComplianceSchema with 5 cross-field refines (≥18, ≤120, NI format when GB, PEP details when isPep, source-of-funds detail when OTHER); onboardingSubmitSchema extended
- UI: new StepCompliance (9 fields, conditional NI/source-detail/PEP-details rendering); WizardProgress 4→5 steps; onboarding page wires new step between Personal and Criteria
- Admin: new full-width Compliance panel on /admin/investors/[id] with SDLT surcharge badge for non-GB taxResidency, prominent gold warning + EDD tag for PEPs, legacy-account flag
- API: persists all fields, normalises NI number (uppercase, no whitespace), respects conditional nulls
- Tests: +14 (compliance lib + schema); 88/88 pass
- Build: clean
- Closes R4 (PEP), R5 (DOB/nationality/tax residency/NI), R6 (structured source of funds)
- **Phase 1 complete — all 7 tasks shipped**

## [2026-05-17] feature | Task 1.6 — TOTP 2FA + recovery codes + 2-step login

- Created: `obsidian/Projects/2026-05-17-task-1-6-totp-2fa.md`
- Deps: otplib@13, qrcode (+ @types)
- Schema: `User.totpSecret`, `User.totpEnabledAt`, new `RecoveryCode` model with bcrypt-hashed codes — pushed to Azure SQL (6.87s)
- Lib: `src/lib/totp.ts` — otplib v13 functional async API (generateSecret, verify with ±30s epochTolerance), QR via qrcode, recovery code gen/match
- API: 4 routes under `/api/portal/security/totp/` (enroll, confirm, disable, recovery-codes); new `/api/auth/login-challenge` (stateless probe — does user need TOTP?)
- Auth: NextAuth authorize() now accepts totpCode; verifies TOTP or burns a single-use recovery code; logs `totp-required` / `bad-totp` / `recovery-code` reasons
- UI: `/portal/security` gains TotpManager (idle/enrol/codes/disable states with QR display); login page goes 2-step (password field locks once TOTP step appears, autofocus on code)
- Tests: +11 for TOTP lib; 74/74 pass
- Build: clean
- Security: recovery codes single-use + bcrypt-hashed, TOTP secret wiped on disable, disable requires password + code, login-challenge rate-limited + lockout-aware + no enumeration
- Closes gap X1 (TOTP layer; passkeys deferred to 6.8)

## [2026-05-17] feature | Task 1.7 — Account lockout + login activity log

- Created: `obsidian/Projects/2026-05-17-task-1-7-account-lockout.md`
- Schema: `LoginAttempt` model (userId nullable, email, ipAddress, success, reason) with 3 composite indexes — pushed to Azure SQL (6.89s)
- Lib: `src/lib/login-tracking.ts` — isIpLockedOut, recordLoginAttempt (fail-safe), recentAttemptsForUser
- Auth: NextAuth `authorize()` now checks lockout, records every attempt with reason (no-user, bad-password, unverified, locked-out, success), passes IP via 2nd param
- Page: `/portal/security` shows last 10 attempts table; Security tab added to portal nav
- Tests: +8 for tracking lib; 63/63 pass
- Build: clean (33 pages, +/portal/security)
- Closes gap X2

## [2026-05-17] feature | Task 1.5 — Password complexity + HIBP + marketing consent

- Created: `obsidian/Projects/2026-05-17-task-1-5-password-marketing.md`
- Schema: `InvestorProfile.marketingConsentAt DateTime?` — pushed to Azure SQL (8.29s)
- Lib: `src/lib/password.ts` — checkPasswordComplexity, passwordStrength, checkPasswordBreached (HIBP k-anonymity, fail-safe)
- Zod: passwordSchema requires upper+lower+digit+symbol+8chars; reused at /api/onboarding and /api/auth/reset-password
- UI: PasswordStrengthMeter (4-bar ramp) on StepAccount; optional marketing checkbox on StepReview (muted styling, not blocking)
- API: HIBP check before bcrypt; marketingConsentAt persisted (timestamp or null)
- Tests: +10 (9 password lib, 1 schema, test fixtures updated to use complex passwords)
- Build: clean (32 pages)
- Closes gaps R7 (separate marketing consent) + R8 (stronger password)

## [2026-05-17] feature | Task 1.3 — CAPTCHA + rate limit on /api/onboarding

- Created: `obsidian/Projects/2026-05-17-task-1-3-captcha-rate-limit.md`
- Lib: `src/lib/rate-limit.ts` (in-memory IP bucket, 5/15min for onboarding) + `src/lib/turnstile.ts` (Cloudflare verify with graceful fallback)
- API: `/api/onboarding` gates on rate limit (429) then CAPTCHA before any DB work
- UI: Turnstile widget on StepReview, dark theme, blocks submit until solved (auto-hidden when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` unset)
- Dep: `@marsidev/react-turnstile@^1.5.2`
- Tests: +12 (7 rate-limit, 5 turnstile); 45/45 pass
- Build: clean (32 pages)
- Setup checklist saved in note: add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` to Azure SWA env to activate CAPTCHA
- Closes gap R2

## [2026-05-17] feature | Task 1.2 — Email verification + verify-before-sign-in

- Created: `obsidian/Projects/2026-05-17-task-1-2-email-verification.md`
- Schema: `User.emailVerifiedAt DateTime?` + new `EmailVerificationToken` model — pushed to Azure SQL (5.22s)
- Backfill: `scripts/backfill-email-verified.ts` grandfathered 5 existing users
- Email template: `src/lib/emails/verification.ts` (24h link)
- API: `POST /api/auth/verify-email/request` (resend, no enumeration), `GET /api/auth/verify-email/[token]` (consume → /login?verified=1)
- Page: `/verify-email-sent` with resend button
- Auth: NextAuth `authorize()` rejects unverified users (admins exempt)
- Onboarding: removed auto sign-in; redirects to /verify-email-sent
- Login: success banner, error banner, "Resend it" inline link
- Tests: 4 new for verify-email request endpoint; total 33/33 pass
- Build: clean (32 pages, +/verify-email-sent)
- Closes gaps R1 (email verification) + R3 (verify-before-sign-in)

## [2026-05-17] plan | Close-All-Gaps Implementation Plan

- Created: `obsidian/Projects/2026-05-17-close-all-gaps-plan.md`
- Updated: `obsidian/index.md` — added Projects entry
- 6-phase plan (~10–12 weeks single-dev) covering all 40+ gaps from the buyer-journey analysis
- Phase 1 (compliance/security): email verification, CAPTCHA, AML data, 2FA, lockout, delete legacy /api/register
- Phase 2 (onboarding): structured targetAreas, multi-select strategy, SPV fields, profile-edit, GDPR
- Phase 3 (deal transaction): per-deal pipeline, structured Offer model, doc room, per-deal messaging — closes the post-acceptance hole
- Phase 4 (matching): public↔portal bridge, favourites, rich deal cards, viewings, auto-match engine
- Phase 5 (portfolio): Property model, doc archive, metrics dashboard
- Phase 6 (KYC modernisation + cross-cutting): Onfido/SumSub, audit log, notifications centre, passkeys
- 5 "quick wins" (one-day total): delete legacy register, env-var the admin email, alignment fixes

## [2026-05-17] query | Comprehensive Buyer Journey Gap Analysis (v2)

- Updated: `obsidian/Knowledge/2026-05-17-buyer-journey-gap-analysis.md` — expanded from 12 gaps to ~40 gaps across 9 lifecycle stages
- Updated: `obsidian/index.md` — refreshed summary
- Added Stage 1 registration deep-dive: 24 gaps (compliance, data model, UX, dead code)
- Added Stage 4–5 KYC gaps (7), Stage 6–7 deal gaps (7), Stage 8 transaction gaps (5), Stage 9 portfolio gaps (4), cross-cutting (6)
- Notable findings: no email verification + auto sign-in = account takeover risk; no PEP/sanctions/DOB/nationality (MLR 2017 non-compliance); legacy `/api/register` dead code with strategy enum mismatch; `targetAreas` is free text blocking auto-matching; homepage "Complete & Build Portfolio" promise has zero supporting code
- Output: 6-phase roadmap (compliance → onboarding → transaction → matching → portfolio → KYC modernisation)

## [2026-05-17] feature | Task 2 - Admin API GET+POST /api/admin/investors/[id]/deals

- Created: `obsidian/Projects/Task_2_Admin_API_Deals_Endpoint.md`
- Updated: `obsidian/index.md` — added Projects entry
- API: `GET /api/admin/investors/[id]/deals` (list deals for investor application), `POST /api/admin/investors/[id]/deals` (create deal, send email notification)
- Zod schema: title, address, askingPrice (positive number), optional summary
- Email: styled HTML with deal card (address, title, price in £, summary), CTA link to `/portal/deals`
- Auth: session required, admin role enforced (401/403 responses)
- Prisma: creates Deal with postedByUserId, fetchesApplication with investorProfile, sends email non-fatally
- Committed `ae8cb79` to master

## [2026-05-17] feature | Portal Messaging — investor communication + admin note highlighting

- Created: `obsidian/Projects/portal-messaging-feature.md`
- Updated: `obsidian/index.md` — added Projects entry
- Prisma: added `Message` model (applicationId, senderUserId, subject, body); pushed to Azure SQL; regenerated client
- API: `GET /api/portal/messages` (investor's message history), `POST /api/portal/messages` (save + email admin)
- UI: `MessageForm` (controlled, subject+body+states), `MessagesClient` (list + form, router.refresh on send), `/portal/messages` server page
- Portal nav: Messages tab added to layout
- StatusTimeline: admin notes now gold-accented (`bg-gold/5 border-l-2 border-gold`, "Note from admin" label, ivory italic text)
- Build: clean (31 pages). Committed `3984893`, pushed to master → Azure deployment triggered

## [2026-05-12] bugfix | Task 19 - Build Verification Fixes

- Created: `obsidian/Bug_Fixes/Task_19_Build_Verification_Fixes.md`
- Updated: `obsidian/index.md` — Added Task 19 entry to Bug Fixes section
- Key points: Four build-blocking issues resolved:
  1. Prisma v7 requires driver adapter — installed @prisma/adapter-mssql, updated prisma.ts and seed-admin.ts
  2. Edge Runtime + Prisma conflict — split auth config into edge-safe auth.config.ts
  3. useSearchParams needs Suspense — extracted LoginForm, wrapped in Suspense boundary
  4. Unused isFuture variable removed from StatusTimeline
- Result: 33 tests pass, production build succeeds, committed as a3ed785
- Source: [[2026-05-12-investor-platform-expansion]]

## [2026-05-12] setup | Task 5 - NextAuth v5 Config + Type Augmentation

- Created: `obsidian/Projects/Task_5_NextAuth_v5_Config.md`
- Created: `src/types/next-auth.d.ts` — Session (id, role) and JWT (id, role) type augmentation
- Created: `src/lib/auth.ts` — NextAuth config with Credentials provider, Zod validation, bcrypt comparison, JWT callbacks
- Created: `src/app/api/auth/[...nextauth]/route.ts` — Route handler re-exporting GET and POST from handlers
- Updated: `obsidian/index.md` — Added Task 5 entry to Projects section
- Key points: Stateless JWT sessions; Zod safeParse prevents invalid credentials from throwing; signIn page set to /login; prisma singleton from @/lib/prisma; bcrypt.compare against user.passwordHash.
- Source: [[2026-05-12-investor-platform-expansion]]

## [2026-05-12] snippet | Task 4 - Azure Blob Storage Helpers

- Created: `obsidian/Snippets/Task_4_Azure_Blob_Storage_Helpers.md`
- Created: `src/lib/azure-blob.ts` — uploadDocument and generatePresignedUrl functions
- Created: `tests/lib/azure-blob.test.ts` — 3 tests (upload, SAS URL, missing credentials)
- Updated: `obsidian/index.md` — Added Task 4 entry to Snippets section
- Key points: TDD approach — test written first (failed: module not found), then implementation added to make all 3 tests pass. Vitest 4.x constructor mock fix: arrow functions in mockImplementation replaced with regular function keyword. SAS token has 5-minute expiry with read-only permission.
- Source: [[2026-05-12-investor-platform-expansion]]

## [2026-05-12] snippet | Task 3 - Prisma Singleton Client

- Created: `obsidian/Snippets/Task_3_Prisma_Singleton_Client.md`
- Updated: `obsidian/index.md` — Added Task 3 entry to Snippets section
- Key points: Implemented singleton pattern using globalThis to prevent multiple PrismaClient instances during Next.js hot-reload in development. Used correct Prisma v7 import path (@/generated/prisma). Caches instance in non-production only. Committed with hash e8979e1.
- Source: [[2026-05-12-investor-platform-expansion]]

## [2026-05-12] setup | Task 2 - Write Full Prisma Schema

- Created: `obsidian/Projects/Task_2_Write_Prisma_Schema.md`
- Updated: `obsidian/index.md` — Added Task 2 entry to Projects section
- Key points: Replaced boilerplate schema with 5 models (User, InvestorProfile, Application, Document, StatusHistory). Migrated to Prisma v7 datasource config (URL in prisma.config.ts). Fixed cyclic referential actions. Generated Prisma Client successfully to src/generated/prisma. Committed with hash 8f49430.
- Source: [[2026-05-12-investor-platform-expansion]]

## [2026-05-12] query | Investor platform implementation plan written

- Created: `docs/superpowers/plans/2026-05-12-investor-platform.md`
- Key points: 19-task plan covering Prisma schema, NextAuth, onboarding wizard, investor portal, admin dashboard, email notifications, Azure Blob uploads. Full TDD with Vitest tests per API route.
- Source: [[2026-05-12-investor-platform-expansion]]

## [2026-05-12] ingest | Investor platform expansion project note created

- Created: `obsidian/Projects/2026-05-12-investor-platform-expansion.md`
- Key points: Documents the scope of the full platform expansion — KYC/AML onboarding flow, ops dashboard, status notifications. Brainstorming session initiated.
- Source: [[2026-05-11-realestate-codebase-understanding]]

## [2026-05-11] query | Codebase understanding captured

- Studied application structure, routes, UI composition, integrations, and tests.
- Wrote technical repository documentation in docs/codebase-understanding-2026-05-11.md.
- Added vault knowledge note: Knowledge/2026-05-11-realestate-codebase-understanding.md.
- Updated index with a Knowledge entry for discovery.

## [2026-05-12] setup | Task 1 - Install Dependencies and Initialize Prisma

- Created: `obsidian/Projects/Task_1_Install_Dependencies_Initialize_Prisma.md`
- Updated: `obsidian/index.md` — Added Task 1 entry to Projects section
- Key points: Installed 72 runtime packages (next-auth@beta, @prisma/client, bcryptjs, @azure/storage-blob, @react-email/components) and 39 dev packages (prisma, @types/bcryptjs). Initialized Prisma with SQL Server datasource. Added postinstall and seed:admin scripts to package.json. Committed with hash a7dfbdc.
- Source: [[2026-05-12-investor-platform-expansion]]

## [2026-05-17] feature | Investor Deal Feedback — full implementation

- Created: `obsidian/Projects/investor-deal-feedback.md`
- Updated: `obsidian/index.md` — added Projects entry
- Prisma: added Deal + DealResponse models; pushed to Azure SQL
- Admin API: GET+POST /api/admin/investors/[id]/deals
- Investor API: GET /api/portal/deals, POST+PUT+DELETE /api/portal/deals/[dealId]/response
- UI: DealCard (4-state), DealsClient, /portal/deals page, /admin/investors/[id]/deals page
- Emails: investor on deal post, admin on response
- Nav: Deals tab in portal layout
- Build: clean (33 pages). Pushed to master → Azure deployment triggered.

## [2026-05-17] setup | Task 1 - Prisma Schema: Add Deal and DealResponse Models

- Created: `obsidian/Projects/Task_1_Prisma_Schema_Deal_Models.md`
- Updated: `obsidian/index.md` — added Task 1 (Deal Models) entry to Projects section
- Key points: Added back-relations to User (postedDeals) and Application (deals). Created Deal model with admin poster, application FK, property details (title, address, askingPrice, summary, status). Created DealResponse model with investor intent + optional comment. Pushed schema to Azure SQL (database synced in 5.83s), regenerated Prisma Client (7.8.0). Committed with hash 6e59ee5.

## [2026-05-17] knowledge | Admin Workflow — Investor Lifecycle

- Created: obsidian/Knowledge/admin-workflow-investor-lifecycle.md
- Updated: obsidian/index.md — added Knowledge entry
- Documents the full 7-stage investor lifecycle and all admin panel actions
