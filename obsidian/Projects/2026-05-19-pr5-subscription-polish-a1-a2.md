---
title: "PR #5 — Subscription polish: A1 (renewal UI) + A2 (preserve in-period nextRenewalAt)"
date: "2026-05-19"
language: "typescript"
status: "complete"
tags: [subscriptions, premium-tier, admin-ux, audit-followup]
---

# PR #5 — Subscription polish (A1 + A2)

Implements the first two items from the [subscription workflow plan](../Knowledge/2026-05-19-subscription-workflow.md): the admin button for generating renewal invoices + the mid-period plan-change preservation. Ships as one PR per the plan's recommendation (~1.5h combined, shared test file, no schema).

## A1 — Admin renewal generator UI

**Endpoint**: `POST /api/admin/subscriptions/generate-renewals?days=N&dryRun=true|false`

Added `dryRun` query param. When `dryRun=true`:
- Runs the same query + idempotency skip logic
- **Does NOT** create invoices, advance `nextRenewalAt`, or send emails
- Returns a preview list (invoice numbers as `(preview)`) in the same shape as the commit response

Response now also includes `investorName` and `userEmail` on each entry (created + skipped) so the UI can show meaningful labels without an extra lookup.

**Client component**: `src/components/admin/RenewalGeneratorButton.tsx`
- Horizon input (1–60 days, default 7)
- "Preview" → calls dry-run → lists subscribers that will be billed + skipped with reasons
- "Send N invoices" → commits if the preview list is non-empty
- Shows the committed result inline with the issued invoice numbers

**Admin page**: `src/app/admin/subscriptions/page.tsx`
- Header stats: active subscribers count, approx MRR (annual subs amortised /12), renewals due ≤ 7 days
- Embedded RenewalGeneratorButton
- "Active subscribers" table sorted by renewal date — overdue rows render in red
- "Cancelled (access ending soon)" section
- Last 20 SUBSCRIPTION invoices (PDF download links)
- Nav link added to admin layout

## A2 — Preserve in-period `nextRenewalAt` on plan-change / reactivation

`POST /api/admin/subscriptions/[userId]`:

```ts
// A2 fix — never set nextRenewalAt backwards.
const stillInPeriod = user.subscription && user.subscription.nextRenewalAt > now
const renewal = stillInPeriod ? user.subscription!.nextRenewalAt : freshRenewal
```

Behaviour matrix:

| Scenario | Prior `nextRenewalAt` | New `nextRenewalAt` | Result |
|---|---|---|---|
| Brand-new subscriber | n/a | `now + period` | Fresh period |
| Reactivate cancelled-but-still-paid-up | future | **preserved** | Keep paid days |
| Plan change mid-period (MONTHLY → ANNUAL) | future | **preserved** | Keep paid days; new billing kicks in at next renewal |
| Reactivate after expiry | past | `now + period` | Fresh period |

Removes the refund/trust risk where an admin pushing "Change plan" mid-month would silently zero out the investor's remaining days.

## Tests

`tests/api/subscriptions.test.ts` — extended (+11 tests):

**A2 (POST):**
- Creates fresh period for brand-new subscriber
- Preserves nextRenewalAt when reactivating cancelled-in-period sub
- Preserves nextRenewalAt on mid-period plan change (MONTHLY → ANNUAL)
- Sets fresh period when prior subscription has already expired
- Rejects non-admin (403)
- 404 when user not found

**A1 (generate-renewals):**
- Rejects non-admin
- Empty result when no subs due
- `dryRun=true` does NOT create invoices or update renewal dates; returns `(preview)` placeholder + investor name
- Commit mode (default) creates invoices and advances renewal
- Skips subscribers billed in the last 25 days (idempotency)

Adopted `NextRequest` from `next/server` for the renewal tests (the route reads `req.nextUrl.searchParams` which doesn't exist on a plain `Request` cast — established this pattern for any future test of a query-param route).

## Verification

- 356/356 tests pass (was 345 → +11 new)
- Production build clean — new `/admin/subscriptions` page in the route list
- No schema migration

## What's still open from the subscription plan

- **B1** — Investor-side cancel / plan-change requests via Messages (~½ day) — defer until A1 + A2 prove out
- **B2** — Per-investor selective billing (~½ day) — only if A1's bulk action proves too coarse
- **C1** — Azure Functions cron for weekly renewals (~½ day) — defer until subscriber count justifies
- **C6 from audit** — InvoiceCounter schema push, awaiting Azure SQL firewall whitelist for IP `154.161.38.129`
