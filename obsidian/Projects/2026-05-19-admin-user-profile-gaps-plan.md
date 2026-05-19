---
title: "Admin user-profile gaps — implementation plan"
date: "2026-05-19"
language: "general"
status: "in-progress"
tags: [admin, user-profile, plan, implementation, multi-pr]
---

# Admin user-profile gaps — implementation plan

Closes all 12 items from [[2026-05-19-admin-user-profile-surface-gap-analysis]].
Sequenced as 9 PRs across 3 phases. Items 1–5 (Phase 1 + start of 2) close the highest-leverage compliance/ops gaps in under a day total. Heaviest item (impersonate) is deferred as a separate security-reviewed PR.

## Phases at a glance

| Phase | PRs | Items closed | Effort | Schema? |
|---|---|---|---|---|
| **1 — Visibility** | A, B | 1, 2, 4 | ~3 h | No |
| **2 — Triage** | C, D | 3, 5, 8 | ~3 h | Optional `Message.kind` |
| **3 — Editability & ops** | E, F, G, H | 6, 7, 9, 11, 12 | ~3 days | Yes (small) |
| **Backlog** | I | 10 | ~1 day + security review | No |

Total: ~6 sprint days, items 1–9 + 11 + 12 shipped. Item 10 (impersonate) deferred.

---

## Phase 1 — Visibility (no schema, no risk)

Render data that the schema already carries.

### PR A — `statusHistory` timeline + account chips (items 1 + 2)

**Goal**: surface email-verified, 2FA, soft-delete, kycCompletedAt, and the statusHistory feed on the admin detail page.

**Files**:
- `src/app/admin/investors/[id]/page.tsx`
  - extend `user` select: `+ emailVerifiedAt, totpEnabledAt, deletedAt, createdAt`
  - render header chips next to entity badge (✓ Email · ✓ 2FA · red banner if `deletedAt`)
  - render `kycCompletedAt` alongside the existing `kycExpiresAt` line
  - render the already-fetched `statusHistory` array as a timeline panel below the 3-col grid
- new `src/components/admin/StatusHistoryTimeline.tsx` (mirror of investor-side `/portal/status` timeline)

**Acceptance criteria**:
- ✓/✗ chips visible for email verification and 2FA
- Soft-deleted user shows red `DELETED dd Mon yyyy` banner at top of page
- KYC completed + expires rendered together
- StatusHistory rendered chronologically with stage, date, actor (if known), note
- Investor still sees the same timeline on their portal (no regression)

**Tests**: 4 render assertions (chips, banner, timeline, kycCompletedAt)

**Effort**: ~1.5 h

---

### PR B — Investor list: tier + PEP chips + filters (items 3 + 4)

**Goal**: at-a-glance compliance/ops triage from the list view.

**Files**:
- `src/app/admin/investors/page.tsx` — extend query include to pull `user.tier`, `investorProfile.isPep`, `complianceCompleted`, `kycExpiresAt`, `entityType`
- `src/components/admin/InvestorTable.tsx` — extend `Investor` interface with new fields; render chips in name column (PREMIUM · ⚠ PEP · ⏳ KYC expiring); add 4 filter dropdowns (Tier · PEP · Compliance · KYC expiring 30d) above existing status/search controls

**Acceptance criteria**:
- Premium subscribers show a small gold tier chip
- PEP investors show a `⚠ PEP` chip — visible without opening the record
- KYC expiring in ≤30d shows an amber chip
- Compliance-incomplete (legacy account) shows a stone-coloured chip
- All 4 new filters compose with existing status + search filters
- "All" option in each filter is the default

**Tests**: filter composition test (2 cases) + 1 render test for chips

**Effort**: ~1.5 h

---

## Phase 2 — Triage (filters + audit + inbox)

### PR C — Audit log: user-scoped filter (item 5)

**Goal**: support incident-review and MLR record-keeping by letting admin see all events touching a specific user.

**Files**:
- `src/app/admin/audit/page.tsx`
  - accept `?actorUserId=` and `?resourceId=` query params (in addition to existing `action`/`resource`)
  - add 2 inputs to the filter form
  - resolve the searched user's email and show it as a chip above the table when filter is active
- `src/app/admin/investors/[id]/page.tsx` — add `View audit events →` link in the new header area that deep-links to `/admin/audit?actorUserId=<user.id>` and a second link `?resourceId=<user.id>`

**Acceptance criteria**:
- Existing filters unaffected
- `?actorUserId=` filters to events the user *performed*
- `?resourceId=` filters to events *about* this resource (works for any resourceType, not only User)
- Deep links from profile page work
- Empty-state copy mentions what was filtered

**Tests**: 4 query-param cases (action only, actor only, resource only, all combined)

**Effort**: ~1 h

---

### PR D — Subscription-request inbox card (item 8)

**Goal**: pending B1 cancel/upgrade/change requests must not get lost in admin's email.

**Files**:
- `src/app/admin/subscriptions/page.tsx` — new "Pending subscription requests" section above the active subscribers table; queries `Message` rows where subject starts with `Subscription request` AND created in last 30d AND admin has no follow-up message on the same `applicationId` newer than the request
- (optional schema **A2**) `Message.kind String? @db.NVarChar(40)` to allow `kind = 'SUBSCRIPTION_REQUEST'` instead of LIKE on subject — update `POST /api/portal/subscription/request` to set it; safer + more queryable
- new `src/components/admin/SubscriptionRequestsInbox.tsx`

**Acceptance criteria**:
- Pending requests render oldest-first
- Each row shows requester name, request type (UPGRADE / CHANGE / CANCEL), elapsed time, message body excerpt
- "View" deep-links to `/admin/investors/[appId]` (Messages tab when PR G lands)
- An admin reply on the same applicationId clears it from the inbox
- Empty state if no pending requests

**Tests**: 3 cases (request without reply shows; request with subsequent admin reply hides; old request > 30d hides)

**Effort**: ~1 h (+30 min if doing the schema option)

---

## Phase 3 — Editability & ops (the substantive lift)

### PR E — Admin-actions panel on the detail page (item 6)

**Goal**: stop admins SSHing to Azure SQL to fix common support cases.

**New endpoints** (all admin-only, all write `AuditEvent`):

| Endpoint | Action | Audit code |
|---|---|---|
| `POST /api/admin/users/[userId]/resend-verification` | New `EmailVerificationToken`, send email | `VERIFICATION_RESENT` |
| `POST /api/admin/users/[userId]/disable-2fa` | Requires `reason`; clears `totpSecret`+`totpEnabledAt`; deletes RecoveryCodes | `TWOFA_DISABLED_BY_ADMIN` |
| `POST /api/admin/users/[userId]/force-password-reset` | New `PasswordResetToken`, send email | `PASSWORD_RESET_FORCED` |
| `POST /api/admin/users/[userId]/soft-delete` | Requires `reason`; sets `User.deletedAt = now()`; **does NOT yet anonymise** (deferred 30d) | `USER_SOFT_DELETED` |
| `POST /api/admin/users/[userId]/restore` | Clears `deletedAt` (only valid before anonymisation cutoff) | `USER_RESTORED` |

**Schema** (small):
- `User.deletionReason String? @db.NVarChar(500)`
- (optional, supports the 30d grace) `User.anonymisedAt DateTime?` — distinct from `deletedAt`; anonymisation cron sets it
- `Application.kind` is NOT touched

**New component**:
- `src/components/admin/UserActionsPanel.tsx` — 5 buttons; the 3 destructive ones (disable-2fa, soft-delete, force-reset) open a confirm modal with required `reason` textarea

**Acceptance criteria**:
- Every action writes an `AuditEvent` with `metadata: { reason }` where applicable
- Disable-2FA also invalidates active sessions (rotate JWT secret signal OR set `User.updatedAt` and rely on `getActiveSession()` H1 path)
- Soft-deleted user is excluded from investor list by default (with a "Show deleted" toggle for compliance review)
- Restore is blocked once `anonymisedAt` is set
- Resend-verification is no-op if `emailVerifiedAt` already set

**Tests**: per-endpoint 401/403/happy-path/audit-write + soft-delete + restore + restore-blocked-after-anonymisation = ~15 cases

**Effort**: ~3–4 h

---

### PR F — InvestorProfile editor (item 7)

**Goal**: every `InvestorProfile` field editable from the admin UI; AML-core edits require a reason; everything writes `AuditEvent`.

**New endpoint**:
- `PATCH /api/admin/applications/[id]/profile` — Zod-validated subset of fields; routes to one of two audit codes:
  - `PROFILE_EDITED` — non-AML changes
  - `PROFILE_AML_EDITED` — when any of `dateOfBirth`, `nationality`, `taxResidency`, `niNumber`, `isPep`, `sourceOfFunds` change; requires `reason` in request body
  - Returns `400 REASON_REQUIRED` if AML edit without reason
  - Metadata includes `{ before, after }` JSON of changed fields only

**New component**:
- `src/components/admin/InvestorProfileEditor.tsx` — toggle-per-section ("Edit" → "Save"/"Cancel" per panel); mirrors the read-view sections
- Existing read-view panels stay; editor replaces them when toggled

**Field rules**:
- `phone` — E.164-normalise on save (reuse `libphonenumber-js` from wizard)
- `niNumber` — uppercase + strip whitespace
- `companyNumber` — uppercase + strip whitespace
- `companyAddress` — was orphan field; now editable
- AML-core fields require reason
- `firstName`, `lastName` — editable (admin support case: name change after marriage / typo)
- NOT editable from this panel: `User.email`, `User.role` (separate ops procedure, requires email-change verification)

**Acceptance criteria**:
- Every non-`User` `InvestorProfile` field is editable
- AML-core requires reason → renders modal
- All edits write `AuditEvent` with diff
- Validation matches the wizard's Zod schemas (cross-field refines preserved)

**Tests**: per-section happy-path + AML-reason-required + diff-in-metadata + validation regression = ~12 cases

**Effort**: ~½ day

---

### PR G — Activity tab + tab-nav refactor (item 9)

**Goal**: unified per-user timeline; convert the 3 standalone routes into tabs sharing one header.

**Files**:
- new `src/app/admin/investors/[id]/layout.tsx` — sticky header (investor name + chips from PR A) + tab strip (`Overview · Deals · Invoices · Activity`)
- existing `[id]/page.tsx` becomes the Overview tab (no code move needed; layout wraps it)
- existing `[id]/deals/page.tsx` and `[id]/invoices/page.tsx` get the same shared header automatically
- new `src/app/admin/investors/[id]/activity/page.tsx` — unified feed merging:
  - `LoginAttempt` (last 50)
  - `AuditEvent` where `actorUserId` OR `resourceId == userId`
  - `Message` where sender is this user OR application matches
  - `Viewing` where investor is this user
  - `DealFavourite` + `ContentfulDealInterest`
  - Sort by `createdAt desc`, paginated 50/page
  - Filter chips above feed to toggle types

**Acceptance criteria**:
- Tab strip works on all 4 admin sub-pages
- Activity feed unifies all 6 entity types
- Filter chips compose
- Pagination works
- No regression on existing 3 pages

**Tests**: unified query + filter test (4 toggle cases) + pagination

**Effort**: ~½ day

---

### PR H — Portfolio card + KYC re-check (items 11 + 12)

**Goal**: surface completed portfolio and let admin launch a SumSub re-check when KYC expires.

**Files**:
- `src/app/admin/investors/[id]/page.tsx` — query `Property[]` for `userId = user.id`; render summary card (count, total purchase price, total est. value, last completion date) below Subscription panel
- new `src/components/admin/KycRecheckButton.tsx` — visible when `kycExpiresAt < now + 30d` OR null; calls new endpoint
- new `POST /api/admin/applications/[id]/kyc-recheck`:
  - creates `KycCheck { provider: 'SUMSUB', status: 'PENDING' }`
  - if `SUMSUB_APP_TOKEN`+`SUMSUB_SECRET_KEY` set: calls SumSub `createApplicant` (or reuses `sumsubApplicantId`) and `requestCheck`
  - emails investor "Please refresh your KYC documents"
  - writes `KYC_RECHECK_LAUNCHED` audit
  - returns the new check id (UI shows "Check launched · pending")
- graceful fallback when SumSub env unset: creates the KycCheck row + email only; admin uploads docs manually

**Acceptance criteria**:
- Property card appears when user has ≥1 Property
- KYC re-check button visible only when expiring ≤30d or expired
- Endpoint writes audit + creates KycCheck + sends email
- Works without SumSub env (no crash)

**Tests**: button visibility + endpoint happy path + missing-env fallback + audit-write

**Effort**: ~1.5 h

---

## Backlog — security-reviewed PR

### PR I — Impersonate / view-as (item 10)

**Goal**: admin can browse the platform as the investor sees it, for support.

**Approach** (subject to security review):
- Read-only mode first — admin's overlaid session can READ as the investor but all WRITE endpoints reject with `IMPERSONATION_READ_ONLY`
- Signed cookie `impersonatorUserId=<admin-id>`; auth callback overlays the investor user object for `sub`/`role`
- All HTTP requests during impersonation get `AuditEvent` metadata `{ impersonator: admin-id, original-sub: admin-id }`
- Unmissable red banner across every page while active
- Cannot impersonate another admin (403 + `IMPERSONATION_BLOCKED` audit)
- Auto-exit after 30 min idle

**Why deferred**:
- Session-security risk
- Requires `superpowers:brainstorming` spike on attack surface
- Lower-leverage than PRs E + F which remove the immediate "ssh to DB" pain

---

## Cross-cutting decisions to lock first

These need owner sign-off before Phase 3 starts:

1. **AML-core field list for `reason`-requirement**
   - Suggested: `dateOfBirth`, `nationality`, `taxResidency`, `niNumber`, `isPep`, `sourceOfFunds`
   - Open: should `firstName`/`lastName` count?
2. **Soft-delete grace window**
   - Suggested: 30 days where `deletedAt` is set but personal data NOT anonymised; restore allowed; cron at day-30 sets `anonymisedAt` and anonymises (same path as `/portal/account/delete`)
3. **Tab vs separate-page** — does owner want PR G to merge the 3 routes into tabs (cleaner) or keep them standalone (lower-risk)?
4. **Impersonate scope** — read-only or read+write? Recommend read-only Phase 1; write-mode behind a follow-up PR

---

## Test strategy

Every new endpoint covers: 401 unauthenticated · 403 non-admin · happy path · audit-write · destructive-action-requires-reason · target-not-found.

Every new component: render test + interaction test.

Vitest target: **374 → ~440 tests** by end of Phase 3.

---

## Schema deltas summary

Only Phase 3 touches the schema. All deltas are additive, nullable, and backwards-compatible.

```prisma
// PR D (optional but recommended)
model Message {
  // ...
  kind String? @db.NVarChar(40)   // 'DEAL_MESSAGE' | 'PORTAL_INBOUND' | 'SUBSCRIPTION_REQUEST'
}

// PR E
model User {
  // ...
  deletionReason String?    @db.NVarChar(500)
  anonymisedAt   DateTime?  // distinct from deletedAt — set by 30d cron
}
```

Two `prisma db push` calls. Both safe to run on Azure SQL with users present.

---

## Recommended PR order + commit cadence

| Sprint day | PRs | Commits |
|---|---|---|
| Day 1 | A + B | 2 PRs, ~3 h, no schema |
| Day 2 | C + D | 2 PRs, ~3 h, 1 optional schema push |
| Day 3 | E | 1 PR, ~3-4 h, 1 schema push |
| Day 4 | F | 1 PR, ~½ day |
| Day 5 | G | 1 PR, ~½ day |
| Day 6 | H | 1 PR, ~1.5 h |
| Backlog | I | separate session with security spike |

Each PR is independently shippable and reverts cleanly.

---

## What's out of scope

- Multi-tenancy / sub-admin role tiers (not needed at current scale)
- Bulk operations (bulk-deactivate, bulk-export) — only worthwhile past ~200 investors
- Admin push notifications inbox (separate plan)
- Reporting / cohort analytics (separate plan)
- Self-merge of duplicate investor accounts
- Migration of all legacy Application.adminNotes → AuditEvent (separate cleanup PR)

📁 Save this note to: obsidian/Projects/2026-05-19-admin-user-profile-gaps-plan.md
