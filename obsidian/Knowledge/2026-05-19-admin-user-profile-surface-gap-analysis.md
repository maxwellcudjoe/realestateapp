---
title: "Admin portal — user profile surface & gap analysis"
date: "2026-05-19"
language: "general"
status: "in-progress"
tags: [admin, user-profile, gap-analysis, ux, ops, compliance]
---

# Admin portal — how each user's profile is used & seen

Scope: every place an admin can view or act on a single user's data (profile, account, KYC, deals, money, security). Maps current surface vs. what the schema actually carries, and flags the gaps that matter for ops, support, and compliance.

Sources audited:
- `src/app/admin/layout.tsx`
- `src/app/admin/investors/page.tsx` (list)
- `src/app/admin/investors/[id]/page.tsx` (detail — the canonical profile view)
- `src/app/admin/investors/[id]/deals/page.tsx`
- `src/app/admin/investors/[id]/deals/[dealId]/page.tsx`
- `src/app/admin/investors/[id]/invoices/page.tsx`
- `src/app/admin/subscriptions/page.tsx`
- `src/app/admin/audit/page.tsx`
- `src/app/admin/match/page.tsx`
- `src/components/admin/*` (11 components)
- `src/app/api/admin/**` (17 routes)
- `prisma/schema.prisma`

---

## 1 · Where admin sees a user today

| Surface | URL | What it shows about the user |
|---|---|---|
| Investor list | `/admin/investors` | name, email, strategy (legacy string), budget, application status, application createdAt |
| Investor detail | `/admin/investors/[id]` | Profile (contact, budget, strategy chips, target-area chips, entity badge), KYC docs, Status panel, Compliance/AML panel (DOB+age, nationality, tax residency, NI, source of funds, PEP, marketing consent), Experience & Funding panel, Subscription panel |
| Investor deals | `/admin/investors/[id]/deals` | Deals admin has posted to this user |
| Deal detail | `/admin/investors/[id]/deals/[dealId]` | Pipeline, offer decision, deal team, response |
| Investor invoices | `/admin/investors/[id]/invoices` | Sourcing / success / subscription invoices for this user |
| Subscriptions board | `/admin/subscriptions` | All active/cancelled subs across users — `Manage →` deep-links to detail |
| Audit log | `/admin/audit` | Global event list — filterable by `action` or `resourceType` only |
| Match & post | `/admin/match` | Investors filtered against a deal template |

Top nav (`AdminLayout`) only exposes **Investors** and **Subscriptions**. Audit log is reachable only from the Investors header. There is **no dedicated User management section** — every admin path goes through the `Application` lens.

---

## 2 · Schema vs. surface — field-by-field coverage

### `User` (12 fields)

| Field | Surfaced? | Where / note |
|---|---|---|
| `id` | indirect | Used by `SubscriptionPanel` |
| `email` | ✅ | Everywhere |
| `passwordHash` | ✅ (correctly hidden) | — |
| `role` | ❌ | Admin can't see if user is admin/investor on profile |
| `emailVerifiedAt` | **❌ GAP** | Admin has no way to see if email is verified |
| `totpSecret` | ✅ hidden | — |
| `totpEnabledAt` | **❌ GAP** | Admin can't see if 2FA is on; can't help locked-out users |
| `deletedAt` | **❌ GAP** | No visible badge / no exclusion from lists |
| `tier` | ✅ | `SubscriptionPanel` shows FREE/PREMIUM chip |
| `createdAt` | ❌ | Only `Application.createdAt` is shown |
| `updatedAt` | ❌ | — |
| `subscription` | ✅ | Sub panel + subscriptions board |

### `InvestorProfile` (33 fields)

| Group | Coverage |
|---|---|
| Identity (firstName, lastName, phone, address) | ✅ all 5 |
| Investment (budgetMin/Max, strategy legacy + structured, buyerType, targetAreas legacy + structured) | ✅ all |
| AML (DOB, nationality, taxResidency, niNumber, isPep, pepDetails, sourceOfFunds, sourceOfFundsDetail, complianceCompleted, marketingConsentAt) | ✅ all 10 |
| Experience (experienceLevel, timelineToBuy, mortgageStatus, mortgageLender, maxLtv, depositAvailable, referralSource) | ✅ all 7 |
| Entity (entityType, companyName, companyNumber, vatNumber) | ✅ |
| `companyAddress` | **❌ GAP** — stored, never rendered |
| `sumsubApplicantId` | **❌ GAP** — no link to launch SumSub re-check, no "View applicant" deep link |

### `Application`

| Field | Surfaced? | Note |
|---|---|---|
| `status`, `adminNotes` | ✅ | StatusPanel |
| `kycExpiresAt` | ✅ | Banner above docs |
| `kycCompletedAt` | **❌ GAP** | We render expiry but not "completed on" |
| `statusHistory` | **⚠ GAP** | **Fetched in the page query but never rendered.** Investor sees their own at `/portal/status`, admin sees nothing |

### Related models — none surfaced on the profile page

| Model | Used elsewhere? | Profile gap? |
|---|---|---|
| `LoginAttempt` | Investor sees their own at `/portal/security` | **❌ admin can't see who tried to log in, when, from what IP** |
| `RecoveryCode` | Investor self-serve | ❌ admin can't see remaining count / regenerate for support |
| `Message` | Per-deal messaging in deal page | ❌ no "all messages from this user" feed; subscription-request messages (B1) land in admin's email inbox only |
| `Notification` | Investor receives, admin doesn't see | ❌ |
| `Viewing` | Surfaced inside each Deal detail | ❌ no "all viewings this investor has requested" view |
| `DealFavourite` + `ContentfulDealInterest` | Investor self-serve | **❌ admin can't see what this investor has saved — material for personalised outreach** |
| `AuditEvent` (this user) | Global page filterable by `action`/`resourceType` | **❌ no filter by `actorUserId`** — to investigate a user you'd grep raw rows |
| `KycCheck` | Schema exists | ❌ never queried by any admin page |
| `Property` (portfolio) | Schema exists | ❌ no admin view of an investor's completed portfolio |
| `Invoice` | `/invoices` subpage | ✅ but only on subpage, not summarised on profile |

---

## 3 · What admin can *mutate* on a user

Mapped from grep of `prisma.{user,investorProfile}.{update,delete}` under `src/app/api/admin/**`:

| Field | Endpoint | Component |
|---|---|---|
| `Application.status` + `adminNotes` + writes `StatusHistory` | `POST /api/admin/investors/[id]/status` | `StatusPanel` |
| `Application.kycCompletedAt`/`kycExpiresAt` | (via doc-review route side effect) | `DocumentReviewRow` |
| `User.tier` | `POST /api/admin/subscriptions/[userId]` | `SubscriptionPanel` |
| `Document.reviewStatus`/`reviewNote` | `POST /api/admin/documents/[id]/review` | `DocumentReviewRow` |
| `Deal.*` (stage, offer-decision, team, invoices) | `/api/admin/deals/**` + `/api/admin/invoices/**` | deal/invoice components |

**Cannot edit from the admin portal at all:**

- Any `InvestorProfile` field — name typo, wrong NI number, stale phone, wrong DOB, wrong nationality, wrong source of funds, change of address, add a missing `companyAddress`. Admin must hit the DB directly.
- Any `User` field — change email, force-reset password, clear `totpSecret` for a locked-out user, set `deletedAt` (soft-delete), restore a deleted user, change `role`.
- Trigger a verification-email resend on behalf of the user.
- Unlock an IP/account after lockout.
- Force-rotate or revoke a user's session.

---

## 4 · Cross-cutting UX gaps

1. **No 360-view.** Profile / Deals / Invoices are three separate pages with full reloads — no tabbed shell, no breadcrumbs back, no quick KPIs ("3 active deals · £24k invoiced · KYC expires in 47 days") on the detail header.
2. **No filters on the investor list** beyond status + name/email. No tier filter, no PEP-flag filter, no "compliance incomplete", no "KYC expiring ≤30d", no "no logins in 90d", no budget range, no entity-type filter.
3. **No tier badge in the investor list** — admin can't tell at a glance who is paying.
4. **`statusHistory` is dead-weight** — fetched in the detail-page query (line 47), never rendered. Either render it or drop the include.
5. **Audit log is not user-scoped.** No `actorUserId` filter, no "audit events about this user" link on the profile page. Compliance-driven incident review would require manual SQL.
6. **Admin sees subscription-request messages (B1) only by email.** The `/admin/subscriptions` page has MRR + lists, but no inbox for pending upgrade/cancel requests. Easy to lose one.
7. **Investor-side `/portal/security` exposes far more than admin can see**: login activity, 2FA state, recovery codes left, data export, account deletion — none of which an admin can observe or assist with.
8. **Soft-delete is invisible.** `User.deletedAt` is checked in NextAuth (PR #4 H1) but the investor list/detail still shows deleted users normally — no banner, no exclusion, no filter to find them.
9. **PEP flag is not surfaced on the list.** EDD investors are findable only by opening every record. A small `⚠ PEP` chip on the row would let compliance triage.
10. **No way to launch SumSub re-check** despite `sumsubApplicantId` being stored. KYC re-review (Task 6.2) has schema (`kycCompletedAt`/`kycExpiresAt`) but no admin button to trigger a fresh check when expiring.
11. **No "impersonate / view-as" affordance** for support — admin can't preview what the investor's portal actually looks like for them right now (free vs premium gating, doc states, etc.).
12. **No portfolio surface.** Phase 5 `Property` model exists; admin has no view of completed properties per investor or aggregate.

---

## 5 · Compliance / ops risks specifically

| Risk | Why it matters |
|---|---|
| Admin can't see `emailVerifiedAt` / `totpEnabledAt` | Support tickets like "I can't log in" require DB access to triage |
| No login-activity table for admin | If an investor reports account compromise, admin can't show them recent IPs or fails |
| No per-user audit timeline | MLR record-keeping calls expect a "show me everything you did with this customer" view |
| `kycCompletedAt` hidden | Re-review windows (typically 18 months MLR) are visually anchored on `kycExpiresAt` only |
| No PEP badge on list | EDD obligations are easy to miss when you scan a long list |
| Deleted users not visually distinguished | Risk of an admin acting on a soft-deleted account |
| No subscription-request inbox | Cancellation requests (statutory cooling-off) could be missed in email |

---

## 6 · Suggested fix sequence (priority order, all small-to-medium)

| # | Fix | Effort | Win |
|---|---|---|---|
| **1** | Render `statusHistory` timeline on the admin detail page (data is already fetched) | ~30 min | Closes wasted-query gap + parity with investor's own view |
| **2** | Add to detail-page header: `emailVerifiedAt` chip, `totpEnabledAt` chip, `deletedAt` red banner, `kycCompletedAt` next to expiry | ~30 min | Support triage without DB |
| **3** | Add **filters** to investor list: tier (FREE/PREMIUM), PEP, compliance-incomplete, KYC-expiring-30d, entity-type | ~1 h | Compliance + ops triage |
| **4** | Add tier chip + PEP badge to investor list rows | ~15 min | At-a-glance triage |
| **5** | Add `actorUserId` (or `resourceId == user.id`) filter to `/admin/audit` + a "view audit events for this user" link on the detail page | ~45 min | MLR record-keeping + incident review |
| **6** | Add an **Admin actions** panel on the detail page: "Resend verification email", "Disable 2FA (with reason)", "Force password reset", "Soft-delete account" — each writes `AuditEvent` | ~3-4 h | Removes 90% of "ssh to DB" support work |
| **7** | Add **InvestorProfile editor** (single PATCH route + form) for non-AML-core fields: phone, address, budget, target areas, strategies, mortgage, referral, `companyAddress` | ~half day | Lets ops fix typos/updates without DB |
| **8** | Pending subscription-request **inbox card** on `/admin/subscriptions` (filter `Message.subject LIKE 'Subscription request%'` + unread badge) | ~1 h | Closes the B1 loop |
| **9** | Add `/admin/investors/[id]/activity` tab: login attempts, audit events, messages sent, viewings requested, favourites — one feed | ~half day | Cross-entity 360-view |
| **10** | "Impersonate / view-as" link in detail page header (server-side session swap with re-auth on exit, full `AuditEvent`) | ~1 day | Major support win, but security-sensitive — design carefully |
| **11** | Portfolio summary card on detail page: `Property[]` count + total purchase price + total est. value | ~1 h (Phase 5 completion check first) | — |
| **12** | "Launch SumSub re-check" button when `kycExpiresAt < +30d` | ~1 h | Phase 6.2 finish |

Items 1–5 are sub-day total and close the highest-leverage compliance/ops gaps. Item 6 is the most user-visible step-change for support. Item 7 is the "stop SSHing to the DB" item.

---

## 7 · What is *not* a gap

- **Profile core AML fields (DOB, nationality, tax residency, NI, PEP, source of funds)** are all fully surfaced with semantic affordances (age, SDLT surcharge chip, EDD tag). This is the strongest part of the current admin profile UI.
- **Document review** is well-modelled — per-doc status, reviewer, note, expiry — and surfaced inline.
- **Subscription state** (tier, plan, started/cancelled/next-renewal) is fully visible in two places (detail page panel + subscriptions board).
- **Entity / SPV display** on detail-page header (LTD chip + company number + VAT) is clean.

---

## 8 · One-liner summary

> The admin **read-surface** for `InvestorProfile` + `Application` is largely complete. The **gaps** are around the `User` account itself (verification, 2FA, deletion, login history), **cross-entity views** (audit events per user, messages feed, favourites, portfolio), **editability** (admin has to SSH to the DB to fix any profile field), and **operational affordances** (resend verify, disable 2FA, impersonate). Almost everything needed to fix this exists in schema — the missing piece is UI plumbing.

📁 Save this note to: obsidian/Knowledge/2026-05-19-admin-user-profile-surface-gap-analysis.md
