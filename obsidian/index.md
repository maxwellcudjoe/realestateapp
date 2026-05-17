# Obsidian Index

Master index for project knowledge captured in this vault.

## Knowledge

| Page | Summary |
|---|---|
| [2026-05-11-realestate-codebase-understanding](Knowledge/2026-05-11-realestate-codebase-understanding.md) | Architecture, route behavior, data flows, testing posture, and extension points for this repository. |
| [admin-workflow-investor-lifecycle](Knowledge/admin-workflow-investor-lifecycle.md) | Full admin workflow — 7-stage investor lifecycle from SUBMITTED to DEAL_SENT, with panel descriptions and business rules. |
| [2026-05-17-buyer-journey-gap-analysis](Knowledge/2026-05-17-buyer-journey-gap-analysis.md) | Comprehensive gap analysis of the buyer journey — registration, KYC, deal response, post-acceptance, portfolio. ~40 gaps across 6 phases with severity + 6-phase roadmap. |

## Projects

| Page | Summary |
|---|---|
| [Task_1_Install_Dependencies_Initialize_Prisma](Projects/Task_1_Install_Dependencies_Initialize_Prisma.md) | Install platform dependencies and initialize Prisma ORM with SQL Server — foundational setup complete. |
| [Task_2_Write_Prisma_Schema](Projects/Task_2_Write_Prisma_Schema.md) | Wrote full Prisma schema (5 models: User, InvestorProfile, Application, Document, StatusHistory) with SQL Server compatibility and Prisma v7 datasource config. |
| [2026-05-12-investor-platform-expansion](Projects/2026-05-12-investor-platform-expansion.md) | Architecture plan for investor onboarding, operations dashboard, and status-tracking notifications — full platform expansion of revebatir.co.uk |
| [Task_5_NextAuth_v5_Config](Projects/Task_5_NextAuth_v5_Config.md) | NextAuth v5 credentials provider with Zod validation, JWT sessions, type augmentation for id + role. |
| [admin-workflow-ui](Projects/admin-workflow-ui.md) | Guided StatusPanel with stage progress indicator, next-step action buttons, pre-filled notes, and manual override. |
| [portal-messaging-feature](Projects/portal-messaging-feature.md) | Investor messaging (DB + email), admin note highlighting in timeline, Messages tab in portal nav. |
| [Task_1_Prisma_Schema_Deal_Models](Projects/Task_1_Prisma_Schema_Deal_Models.md) | Added Deal and DealResponse models to Prisma schema — admins post property deals, investors respond with intent. Pushed to Azure SQL and regenerated Prisma Client. |
| [Task_2_Admin_API_Deals_Endpoint](Projects/Task_2_Admin_API_Deals_Endpoint.md) | Admin API route GET+POST /api/admin/investors/[id]/deals — list deals and create new deal with investor email notification. |
| [investor-deal-feedback](Projects/investor-deal-feedback.md) | Full deal feedback feature — admin posts deals, investor CRUD responses, 5 API routes, DealCard 4-state UI, email notifications. |
| [2026-05-17-close-all-gaps-plan](Projects/2026-05-17-close-all-gaps-plan.md) | 6-phase, ~12-week sequenced plan to close all 40+ buyer-journey gaps. Schema diffs, files affected, AC, and risk notes per task. |
| [2026-05-17-task-1-2-email-verification](Projects/2026-05-17-task-1-2-email-verification.md) | Phase 1 Task 1.2 complete — email verification + verify-before-sign-in. EmailVerificationToken model, /verify-email-sent page, login banner, NextAuth gate. Closes R1+R3. |
| [2026-05-17-task-1-3-captcha-rate-limit](Projects/2026-05-17-task-1-3-captcha-rate-limit.md) | Phase 1 Task 1.3 complete — IP rate limit (5/15min) + Turnstile CAPTCHA on /api/onboarding with graceful fallback. Closes R2. |
| [2026-05-17-task-1-5-password-marketing](Projects/2026-05-17-task-1-5-password-marketing.md) | Phase 1 Task 1.5 complete — password complexity rules, HIBP breach check (k-anonymity), strength meter, separate GDPR marketing consent. Closes R7+R8. |
| [2026-05-17-task-1-7-account-lockout](Projects/2026-05-17-task-1-7-account-lockout.md) | Phase 1 Task 1.7 complete — LoginAttempt model, IP lockout (5 fails / 15 min), `/portal/security` activity table. Closes X2. |
| [2026-05-17-task-1-6-totp-2fa](Projects/2026-05-17-task-1-6-totp-2fa.md) | Phase 1 Task 1.6 complete — opt-in TOTP 2FA with QR enrolment, 10 single-use recovery codes, 2-step login flow, /portal/security manager. Closes X1. |
| [2026-05-17-task-1-4-aml-data](Projects/2026-05-17-task-1-4-aml-data.md) | Phase 1 Task 1.4 complete — AML data capture (DOB, nationality, tax residency, NI, PEP, source of funds), new StepCompliance wizard step, admin Compliance panel. Closes R4+R5+R6. **Phase 1 done.** |
| [2026-05-17-task-2-1-structured-target-areas](Projects/2026-05-17-task-2-1-structured-target-areas.md) | Phase 2 Task 2.1 complete — TargetArea model + 54-area catalog + multi-select picker. Unlocks Phase 4 auto-matching. Closes R10. |
| [2026-05-17-task-2-2-multi-select-strategy](Projects/2026-05-17-task-2-2-multi-select-strategy.md) | Phase 2 Task 2.2 complete — InvestorStrategy model + 5 canonical codes, multi-select checkbox UI, Any/All mismatch removed, legacyToStrategies mapper. Closes R11. |
| [2026-05-17-task-2-4-experience-funding](Projects/2026-05-17-task-2-4-experience-funding.md) | Phase 2 Task 2.4 complete — experience level, timeline, mortgage status/lender/LTV/deposit, referral source. Closes R12+R13+R14+R15. |
| [2026-05-17-task-2-6-phone-e164](Projects/2026-05-17-task-2-6-phone-e164.md) | Phase 2 Task 2.6 complete — libphonenumber-js validation, E.164 normalisation on store. Closes R17. |
| _(Task 2.9 — password change in portal)_ | New PasswordChangeForm + POST /api/portal/password/change on /portal/security. Closes R21. (Inline-logged) |

## Bug Fixes

| Page | Summary |
|---|---|
| [Task_19_Build_Verification_Fixes](Bug_Fixes/Task_19_Build_Verification_Fixes.md) | Prisma v7 constructor (adapter required), Edge Runtime compatibility (auth.config split), Suspense boundary for useSearchParams, unused variable — all resolved. |

## Snippets

| Page | Summary |
|---|---|
| [Task_3_Prisma_Singleton_Client](Snippets/Task_3_Prisma_Singleton_Client.md) | Prisma singleton client pattern for Next.js — prevents multiple instances during hot-reload in development using globalThis caching. |
| [Task_4_Azure_Blob_Storage_Helpers](Snippets/Task_4_Azure_Blob_Storage_Helpers.md) | Azure Blob Storage helpers for KYC document upload and 5-minute pre-signed SAS URL generation — with full Vitest mock test suite. |

## Prompts

| Page | Summary |
|---|---|

## Daily Journal

| Page | Summary |
|---|---|
