# Obsidian Log

Append-only record of vault updates.

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
