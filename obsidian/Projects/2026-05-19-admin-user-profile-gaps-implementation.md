---
title: "Admin user-profile gaps — implementation (PRs A–H)"
date: "2026-05-19"
language: "typescript"
status: "complete"
tags: [admin, user-profile, implementation, multi-pr, audit, kyc]
---

# Admin user-profile gaps — implementation

Executed the full 8-PR plan from [[2026-05-19-admin-user-profile-gaps-plan]] in one session. All 12 gaps from [[2026-05-19-admin-user-profile-surface-gap-analysis]] closed (PR I impersonate remains deferred).

**Outcome**: 374 → 468 tests (+94), build clean, schema pushed once.

## What shipped, by PR

### PR A — statusHistory timeline + account chips
- New `src/components/admin/StatusHistoryTimeline.tsx` (~100 LoC)
- Detail page (`src/app/admin/investors/[id]/page.tsx`):
  - Extended user select to include `emailVerifiedAt`, `totpEnabledAt`, `deletedAt`, `createdAt`
  - Header chips: `✓ Email verified` / `Email unverified`, `✓ 2FA enabled` / `2FA off`
  - Soft-delete red banner at top when `deletedAt` is set
  - `kycCompletedAt` now rendered alongside `kycExpiresAt`
  - `statusHistory` (was fetched but never rendered) is now displayed with actor email + diff arrows + admin notes

### PR B — investor list filters + chips
- New `src/lib/investor-filter.ts` (pure helper)
- New `tests/lib/investor-filter.test.ts` (16 tests)
- List page query extended: `user.tier`, `user.deletedAt`, profile `isPep`/`complianceCompleted`/`entityType`, `kycExpiresAt`
- 6 new filter dropdowns: Tier, PEP, Compliance, KYC-expiring-30d, Entity-type, Show-deleted toggle
- Row chips: `Premium`, `⚠ PEP`, `⏳ KYC`, `Legacy`, `Deleted`
- Soft-deleted rows are hidden by default; toggle to show

### PR C — user-scoped audit log filter
- Audit page (`src/app/admin/audit/page.tsx`):
  - New query params `?actorUserId=` and `?resourceId=`
  - Two new inputs in the filter form
  - Focused-actor email chip shown above results when filtered
  - Pagination links preserve all 4 filter params via shared `qs()` helper
- Detail page now has 2 new deep links: "Audit by this user →" and "Audit about this user →"

### PR D — subscription-request inbox card
- New `src/lib/subscription-requests.ts` (pure helper)
- New `tests/lib/subscription-requests.test.ts` (13 tests)
- Subscriptions page (`src/app/admin/subscriptions/page.tsx`):
  - Queries last-30d messages with subject `[Subscription request]`
  - Queries admin replies on the same applicationIds
  - `pendingSubscriptionRequests()` filters out requests where any admin replied later
  - New "Pending subscription requests · N" card above active subscribers
  - Each row: name, request type, body excerpt, elapsed time, "Open profile →" link
- Did **not** add `Message.kind` schema (LIKE is sufficient at current scale)

### PR E — admin actions panel + 5 endpoints
- Schema pushed: `User.deletionReason String?`, `User.anonymisedAt DateTime?`
- 5 new audit codes: `VERIFICATION_RESENT`, `TWOFA_DISABLED_BY_ADMIN`, `PASSWORD_RESET_FORCED`, `USER_SOFT_DELETED`, `USER_RESTORED`
- 5 new endpoints under `src/app/api/admin/users/[userId]/`:
  - `resend-verification` — invalidates existing tokens, mints new 24h token, emails user
  - `disable-2fa` — requires `reason`, transactionally clears `totpSecret`/`totpEnabledAt` + deletes `RecoveryCode`s
  - `force-password-reset` — invalidates existing tokens, mints new 1h token, emails user
  - `soft-delete` — requires `reason`, sets `deletedAt`+`deletionReason`. Blocks self-delete + admin-delete + double-delete
  - `restore` — clears `deletedAt`+`deletionReason`. Returns 410 if `anonymisedAt` is set (cron has run)
- New `src/components/admin/UserActionsPanel.tsx` — 5 buttons (visibility-aware), modal with required `reason` for destructive ones
- New `tests/api/admin-user-actions.test.ts` — 19 endpoint tests (auth/role/validation/audit-write)

### PR F — investor profile editor
- New `src/lib/schemas/admin-profile.ts`:
  - `adminProfileUpdateSchema` (Zod) covering 30 fields across Identity, Entity, Investment, AML, Experience
  - `AML_CORE_FIELDS` set (8 fields): `dateOfBirth`, `nationality`, `taxResidency`, `niNumber`, `isPep`, `pepDetails`, `sourceOfFunds`, `sourceOfFundsDetail`
  - `touchedAmlFields()` + `computeDiff()` helpers
  - Cross-field refines: budget range, valid country/source/entity/experience codes, NI regex, Companies House regex (LTD only), age 18-120
- 2 new audit codes: `PROFILE_EDITED_BY_ADMIN`, `PROFILE_AML_EDITED_BY_ADMIN`
- New endpoint `PATCH /api/admin/applications/[id]/profile`:
  - Routes to one of two audit codes based on AML-touched
  - AML edits require `reason ≥ 3 chars` → 400 `REASON_REQUIRED` otherwise
  - Normalises phone (E.164), NI/company/VAT (uppercase no-whitespace), DOB to Date
  - Switching to `INDIVIDUAL` blanks entity fields
  - Audit metadata contains the diff
- New `src/components/admin/InvestorProfileEditor.tsx` — sectioned form (Identity, Entity, Investment, AML, Experience), tracks dirty fields, AML reason textarea auto-appears when any AML field is dirty
- New tests: `tests/lib/admin-profile-schema.test.ts` (18) + `tests/api/admin-profile-patch.test.ts` (11)

### PR G — activity feed (tab refactor deferred)
- New `src/lib/user-activity.ts` — `ActivityEvent` union + 5 mappers (LOGIN/AUDIT/MESSAGE/VIEWING/FAVOURITE) + `mergeActivity()` sorter/filter
- New `tests/lib/user-activity.test.ts` (10 tests)
- New `src/app/admin/investors/[id]/activity/page.tsx`:
  - Parallel queries on `LoginAttempt`, `AuditEvent` (actor OR resource), `Message`, `Viewing`, `DealFavourite`, `ContentfulDealInterest`
  - Unified chronological feed, paginated 100/kind
  - Filter chips at top toggle kinds via `?kinds=` query param
- Detail page gets a new "View Activity →" link
- **Deferred**: the planned tab-nav refactor (3 standalone routes → tabs). Activity is a peer page for now; refactor can ship later as a small visual change without backend churn.

### PR H — portfolio card + KYC re-check
- New audit code: `KYC_RECHECK_LAUNCHED`
- New endpoint `POST /api/admin/applications/[id]/kyc-recheck`:
  - Reads env vars at request-time (test-friendly) — `provider: 'SUMSUB' | 'MANUAL'`
  - Creates `KycCheck { status: 'PENDING' }` row
  - Emails investor asking to refresh KYC docs (non-fatal)
  - Writes audit with `{ provider, kycCheckId }`
- New `src/components/admin/KycRecheckButton.tsx` — only visible when `kycExpiresAt` is null or ≤30d away; confirm dialog before submit
- New `src/components/admin/PortfolioSummaryCard.tsx` — only renders when ≥1 Property exists; shows counts + total purchase + est. value + tenanted ratio + first 5 properties
- Detail page queries Properties for the user and renders the card above Status History
- New `tests/api/admin-kyc-recheck.test.ts` (7 tests)

## Files changed (summary)

**New** (16):
- `src/lib/investor-filter.ts`
- `src/lib/subscription-requests.ts`
- `src/lib/schemas/admin-profile.ts`
- `src/lib/user-activity.ts`
- `src/components/admin/StatusHistoryTimeline.tsx`
- `src/components/admin/UserActionsPanel.tsx`
- `src/components/admin/InvestorProfileEditor.tsx`
- `src/components/admin/KycRecheckButton.tsx`
- `src/components/admin/PortfolioSummaryCard.tsx`
- `src/app/admin/investors/[id]/activity/page.tsx`
- `src/app/api/admin/users/[userId]/resend-verification/route.ts`
- `src/app/api/admin/users/[userId]/disable-2fa/route.ts`
- `src/app/api/admin/users/[userId]/force-password-reset/route.ts`
- `src/app/api/admin/users/[userId]/soft-delete/route.ts`
- `src/app/api/admin/users/[userId]/restore/route.ts`
- `src/app/api/admin/applications/[id]/profile/route.ts`
- `src/app/api/admin/applications/[id]/kyc-recheck/route.ts`

**Modified** (5):
- `src/app/admin/investors/page.tsx` — extended query + investor row shape
- `src/components/admin/InvestorTable.tsx` — chips + filters via new lib
- `src/app/admin/investors/[id]/page.tsx` — wires 5 new components + adds 3 new deep links
- `src/app/admin/audit/page.tsx` — 2 new filter params + focused-actor chip
- `src/app/admin/subscriptions/page.tsx` — pending-requests inbox
- `src/lib/audit.ts` — 8 new action codes
- `prisma/schema.prisma` — 2 new User columns

**Tests added** (6 files):
- `tests/lib/investor-filter.test.ts` — 16
- `tests/lib/subscription-requests.test.ts` — 13
- `tests/lib/admin-profile-schema.test.ts` — 18
- `tests/lib/user-activity.test.ts` — 10
- `tests/api/admin-user-actions.test.ts` — 19
- `tests/api/admin-profile-patch.test.ts` — 11
- `tests/api/admin-kyc-recheck.test.ts` — 7

**Total**: 374 → 468 tests (+94). Build clean throughout.

## Schema deltas

```prisma
model User {
  // ...
  deletionReason String?   @db.NVarChar(500)
  anonymisedAt   DateTime?
  // ...
}
```

One `prisma db push` (4.64s).

## Notes for the next pass

- **PR I (impersonate)** still on the backlog — needs security spike with `superpowers:brainstorming` before implementing.
- **Tab refactor for `[id]/{overview,deals,invoices,activity}`** deferred from PR G — purely cosmetic, can ship anytime.
- **Anonymisation cron at day-30** still TODO — endpoint `restore` checks `anonymisedAt`, but no cron sets it yet. Implementing it is a small follow-up (similar shape to weekly-renewals cron in `.github/workflows/`).
- **AML edits** currently let admin set fields freely, with a reason. Worth considering a 2-person approval pattern (compliance officer signs off) before this lands in production — current behaviour is acceptable for a 1-person shop.

## 🤖 AI Prompts Used

Single multi-turn session covering analysis → plan → execute. No additional prompts.

📁 Save this note to: obsidian/Projects/2026-05-19-admin-user-profile-gaps-implementation.md
