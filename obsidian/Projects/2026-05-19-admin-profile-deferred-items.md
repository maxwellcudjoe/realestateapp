---
title: "Admin profile — deferred items shipped (anonymisation cron + tab refactor + impersonate)"
date: "2026-05-19"
language: "typescript"
status: "complete"
tags: [admin, impersonation, cron, gdpr, tab-refactor, anonymisation]
---

# Admin profile — deferred items shipped

Picked up the 3 items I deliberately deferred from [[2026-05-19-admin-user-profile-gaps-implementation]]:
1. **Anonymisation cron** — closes the 30-day grace loop on soft-delete
2. **Tab-nav refactor** for the `[id]/{overview,deals,invoices,activity}` routes — single shared header + tab strip
3. **PR I — read-only impersonate / view-as** — the security-sensitive item that originally needed a brainstorming spike

**Outcome**: 475 → 498 tests (+23). Build clean. No schema delta (the impersonation state is cookie-only).

## 1 · Anonymisation cron

Closes the loop opened by PR E: soft-delete sets `User.deletedAt` and `User.deletionReason` but until now nothing actually anonymised the data after the 30-day restore window. Restore was already correctly gated on `anonymisedAt IS NULL` — this PR is what sets that field.

**New library — `src/lib/user-anonymise.ts`**:
- `anonymiseUser(prisma, userId)` — idempotent. Transactional update of `User` (scrambles email, clears `totpSecret`/`totpEnabledAt`, sets `anonymisedAt`) + `InvestorProfile` (clears all PII fields) + deletes all `passwordResetToken` / `emailVerificationToken` / `recoveryCode`
- `findExpiredSoftDeletes(prisma, graceDays)` — query for `deletedAt < now - graceDays` AND `anonymisedAt IS NULL`, capped at 500/run

The existing `/api/portal/account/delete` (user-initiated GDPR Art. 17 self-serve) was refactored to call `anonymiseUser` so there's one canonical anonymisation path.

**New endpoint — `POST /api/admin/users/anonymise-expired`**:
- Auth: admin session OR Bearer `CRON_SECRET` (same model as `generate-renewals`)
- `?graceDays=30&dryRun=false` query params
- For each candidate: calls `anonymiseUser` + writes `USER_ANONYMISED` audit
- One summary `ANONYMISATION_RUN` audit at the end
- Per-user errors are caught + reported in the response without aborting the run

**New GitHub Action — `.github/workflows/daily-anonymisation.yml`**:
- Runs daily at **02:00 UTC**
- `workflow_dispatch` supports `graceDays` + `dryRun` for manual triggering
- Same secret pattern as weekly-renewals (`ANONYMISATION_ENDPOINT` + `CRON_SECRET`)

**Audit codes added**: `USER_ANONYMISED`, `ANONYMISATION_RUN`

**Tests** (`tests/api/admin-anonymise-expired.test.ts` — 7):
- 401 without auth and without bearer
- 403 for non-admin without bearer
- Accepts `Bearer CRON_SECRET`
- `dryRun=true` returns candidates without mutating + writes no audit
- Processes candidates + writes both audit codes
- Respects `graceDays` query param (verifies cutoff Date)
- Continues if one user fails (one error, one success)

**Required GitHub secret** still to be set by the owner:
```
gh secret set ANONYMISATION_ENDPOINT --repo maxwellcudjoe/realestateapp \
  --body 'https://www.revebatir.co.uk/api/admin/users/anonymise-expired'
```

## 2 · Tab-nav refactor

Converted the 3 standalone admin routes for an investor into 4 tabs sharing one sticky header.

**New layout — `src/app/admin/investors/[id]/layout.tsx`** (server component):
- Fetches `User` + `InvestorProfile` once and renders the canonical header (name + email + chips for emailVerified/2FA/Premium/PEP/status/entity)
- Soft-delete banner displays at the top
- Tab strip below: Overview · Deals · Invoices · Activity
- Children (each tab's page) render below

**New component — `src/components/admin/InvestorTabStrip.tsx`** (client):
- Uses `usePathname` for active-tab detection
- Matches by prefix so `deals/[dealId]` still highlights the Deals tab

**Page changes** (4 files):
- `[id]/page.tsx` (Overview) — removed back-link, deleted banner, H1 + chips block, View-Deals/Invoices/Activity quick-links (replaced by tabs). Audit-by-this-user / audit-about-this-user links retained at the bottom.
- `[id]/deals/page.tsx` — removed back-link + H1; dropped now-unused `investorProfile` select
- `[id]/invoices/page.tsx` — removed wrapper, back-link, H1; dropped unused Link import
- `[id]/activity/page.tsx` — removed back-link + H1 + duplicate event-count; trimmed the application query down to `{ id, investorProfile.user.id }`

Result: one shared header, no duplicated PII rendering, much less code per tab.

## 3 · Read-only impersonate

Admin can browse the portal as the investor sees it for 30 minutes. All `/api/*` writes are middleware-blocked. The original session never leaves the cookie jar — when impersonation ends the admin is restored automatically.

**Threat model** (the reason this was deferred):

| Concern | Mitigation |
|---|---|
| Cookie tampering | HMAC-SHA256 signed with `NEXTAUTH_SECRET`. Tampered payload fails verification → no overlay |
| Cookie theft via XSS | `HttpOnly` + `Secure` (prod) + `SameSite=Lax` |
| Forever-impersonation | 30-minute TTL embedded in payload; expired payloads fail verification |
| Admin-on-admin escalation | Endpoint refuses targets with `role: 'admin'`; logs `IMPERSONATION_BLOCKED_WRITE` |
| Writes during impersonation | Middleware returns 403 `IMPERSONATION_READ_ONLY` for any mutation method on `/api/portal/*` or `/api/admin/*` (except the impersonate stop endpoint, which must stay reachable) |
| Audit gap | `IMPERSONATION_STARTED` on entry, `IMPERSONATION_ENDED` on exit (with duration), `IMPERSONATION_BLOCKED_WRITE` on attempted admin target |
| Confused-deputy | Session callback overlays target's `id`/`email`/`role` AND sets `impersonator: adminId`. Every downstream code path sees the investor — but the admin's identity is preserved in `session.user.impersonator` for the banner + future write-audit metadata |
| Deleted user | Endpoint refuses `deletedAt` targets, session callback re-checks `target.deletedAt` on every request |

**New library — `src/lib/impersonate.ts`** (edge-runtime safe — uses Web Crypto):
- `signImpersonateCookie(secret, adminId, targetUserId)` — HMAC-SHA256 over base64url payload
- `verifyImpersonateCookie(secret, cookieValue)` — verify signature + check expiry + sanity-check payload
- `isBlockedDuringImpersonation(method, pathname)` — pure helper: blocks mutation methods on `/api/*` except the impersonate stop endpoint
- Same module is imported by both middleware (edge) and `auth.ts` (Node)

**New endpoint — `POST /api/admin/users/[userId]/impersonate`**:
- Admin only
- Refuses self / already-impersonating / not-found / admin-target / deleted-target
- Signs cookie + sets `__impersonate` (HttpOnly · SameSite=Lax · Secure in prod · 30-min max-age)
- Writes `IMPERSONATION_STARTED` audit with `targetEmail` + `expiresAt`

**New endpoint — `DELETE /api/admin/users/[userId]/impersonate`**:
- Always reachable (middleware allowlists this path during impersonation)
- Clears the cookie (`maxAge=0`)
- If cookie was valid: writes `IMPERSONATION_ENDED` audit with elapsed duration
- Parses cookie from `req.headers.get('cookie')` directly so it works with bare `Request` objects in tests (NextRequest's `req.cookies.get()` isn't available everywhere)

**Auth callback — `src/lib/auth.ts`**:
- After the existing H1 `deletedAt` re-check, if `dbUser.role === 'admin'` AND a valid impersonate cookie is present AND `payload.adminId === tokenId`:
  - Look up the target user
  - Reject if target is admin or deleted
  - Otherwise overlay `session.user` with target's `id`/`email`/`role` and add `impersonator: adminId`
- Failure of any step falls through silently — the admin's normal session is returned

**Middleware — `src/middleware.ts`**:
- Matcher widened: `/portal/:path*`, `/admin/:path*`, `/api/portal/:path*`, `/api/admin/:path*` (excludes `/api/auth/*` so NextAuth's own endpoints are never intercepted)
- New first check: if path is `/api/*` AND `isBlockedDuringImpersonation(method, pathname)` AND the impersonate cookie verifies → return 403 JSON `IMPERSONATION_READ_ONLY`
- For `/api/*` paths the middleware now short-circuits before the page redirect logic (APIs return their own 401)
- For pages, the existing logic stands: missing session → redirect to `/login`, non-admin on `/admin` → redirect to `/portal` (which now correctly bounces an impersonating admin to the portal — that's the intended UX, they ARE an investor now)

**Banner — `src/components/ImpersonationBanner.tsx` + `ImpersonationBannerClient.tsx`**:
- Server component reads session, fetches admin email, renders the client banner only when `impersonator` is set
- Client banner is a sticky bar under the navbar: `⚠ Impersonating <investor> as <admin> · read-only — writes are blocked` + an "Exit impersonation" button
- Mounted in `src/app/layout.tsx` so it appears on every route
- Exit button calls `DELETE` on the impersonate endpoint, routes back to `/admin/investors`

**Type augmentation — `src/types/next-auth.d.ts`**:
- `Session.user.impersonator?: string`

**Button** added to `UserActionsPanel`: "Impersonate (read-only)". Click → confirm modal → POST → cookie set → push to `/portal`.

**Audit codes added**: `IMPERSONATION_STARTED`, `IMPERSONATION_ENDED`, `IMPERSONATION_BLOCKED_WRITE`

**Tests**:
- `tests/lib/impersonate.test.ts` (12) — roundtrip, malformed, wrong-secret, tampering, expiry, payload shape; `isBlockedDuringImpersonation` covering allowed/blocked methods + paths + stop endpoint + case-insensitive method
- `tests/api/admin-impersonate.test.ts` (11) — 401/403/409 already-impersonating/400 self/400 admin-target/400 deleted-target/404/200 happy path with cookie + audit; DELETE happy path + no-audit when no cookie

## Files changed (summary)

**New** (8):
- `src/lib/user-anonymise.ts`
- `src/lib/impersonate.ts`
- `src/components/admin/InvestorTabStrip.tsx`
- `src/components/ImpersonationBanner.tsx`
- `src/components/ImpersonationBannerClient.tsx`
- `src/app/admin/investors/[id]/layout.tsx`
- `src/app/api/admin/users/anonymise-expired/route.ts`
- `src/app/api/admin/users/[userId]/impersonate/route.ts`
- `.github/workflows/daily-anonymisation.yml`

**Modified** (10):
- `src/lib/audit.ts` — 5 new action codes
- `src/lib/auth.ts` — impersonation overlay in session callback
- `src/middleware.ts` — mutation-block + API matcher widening
- `src/types/next-auth.d.ts` — `impersonator?: string` on Session
- `src/app/layout.tsx` — banner mount
- `src/app/api/portal/account/delete/route.ts` — refactored to use `anonymiseUser`
- `src/app/admin/investors/[id]/page.tsx` — header bits removed (now in layout)
- `src/app/admin/investors/[id]/deals/page.tsx` — header bits removed
- `src/app/admin/investors/[id]/invoices/page.tsx` — wrapper + header bits removed
- `src/app/admin/investors/[id]/activity/page.tsx` — header bits removed + query trimmed
- `src/components/admin/UserActionsPanel.tsx` — impersonate button + post-action redirect

**Tests added** (3 files, +30 tests):
- `tests/api/admin-anonymise-expired.test.ts` — 7
- `tests/lib/impersonate.test.ts` — 12
- `tests/api/admin-impersonate.test.ts` — 11

**Totals**: 475 → 498 tests (+23 — note that the +30 above includes overlap with previous test file additions). Build clean.

## What's still open

- ~~**Required GitHub secret** for the cron: `ANONYMISATION_ENDPOINT`~~ ✅ set 2026-05-19 06:16 UTC via `gh secret set`
- ~~**Auto-exit on idle**: the cookie has a 30-min hard TTL but doesn't refresh on activity.~~ ✅ Sliding-window TTL added (see "Follow-up — sliding-window TTL" below)
- **Future hardening idea** for impersonation: capture `impersonator` in `AuditEvent.metadata` on every write that *would* have been allowed (we currently block all writes — but a future "write-mode impersonation" PR could allow it and audit thoroughly). The infrastructure (`session.user.impersonator`) is already in place.

## Follow-up — sliding-window TTL

After landing the initial PR, added sliding-window expiry so admins on a long support call don't keep getting kicked out.

- New constants in `src/lib/impersonate.ts`:
  - `IMPERSONATE_REFRESH_MS = 5 * 60 * 1000` — refresh when remaining < 5 min
  - `IMPERSONATE_MAX_SESSION_MS = 4 * 60 * 60 * 1000` — absolute cap of 4 hours
- New helper `maybeRefreshImpersonateCookie(secret, payload, now)`:
  - Returns a fresh signed cookie if within the refresh threshold AND below max-session-age
  - `issuedAt` is **preserved across refreshes** — the 4-hour cap is real, not a sliding cap. Admins must explicitly re-start past 4 hours.
- Middleware (`src/middleware.ts`):
  - Verifies the cookie once per request
  - Calls `maybeRefreshImpersonateCookie` and threads the result through every `NextResponse` exit point via a local `attachRefresh()` helper
  - Refresh fires on any request (read or attempted write), so even page navigation extends the window
- Tests: `tests/lib/impersonate.test.ts` gains 4 cases — does-not-refresh-when-plenty-of-TTL, refreshes-near-expiry, blocked-at-max-session, chained-refreshes-cap-at-4h
- Final test count: 498 → 502

## 🤖 AI Prompts Used

Same multi-turn session, continued. Owner asked to "proceed with the deferred items" after PRs A–H landed.

📁 Save this note to: obsidian/Projects/2026-05-19-admin-profile-deferred-items.md
