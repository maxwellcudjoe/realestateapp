---
title: "PR #6 — Subscription B1 (investor requests) + B2 (selective billing) + C1 (cron)"
date: "2026-05-19"
language: "typescript"
status: "complete"
tags: [subscriptions, premium-tier, investor-ux, cron, automation]
---

# PR #6 — Subscription workflow completion (B1 + B2 + C1)

Implements the remaining three items from the [subscription workflow plan](../Knowledge/2026-05-19-subscription-workflow.md), shipping the full subscription lifecycle automation.

## C1 — Automated weekly renewal billing

**Auth path on the endpoint** (`src/app/api/admin/subscriptions/generate-renewals/route.ts`): now accepts EITHER an admin session OR a Bearer token matching the `CRON_SECRET` env var. Without `CRON_SECRET` set, only the session path works (so adding the workflow doesn't open a security hole by accident).

**GitHub Actions workflow**: `.github/workflows/weekly-renewals.yml`
- Runs every Monday 09:00 UTC via `schedule` trigger
- Also `workflow_dispatch` for manual runs from the Actions UI (with horizon + dry-run inputs)
- Calls `POST {RENEWALS_ENDPOINT}?days=N&dryRun={true|false}` with `Authorization: Bearer {CRON_SECRET}` header
- Exits non-zero on non-200 response (so failures show as red in Actions UI)
- Writes a summary table to the workflow run page: horizon, dry-run flag, created/skipped counts

**Why GitHub Actions, not Azure Functions**: simpler. Same scheduling guarantees for this use case (weekly cadence, tolerance for ±1h drift). No new Azure infrastructure to provision. The cron lives next to the code that defines its contract. If you later want millisecond-precision scheduling or millions of invocations, Azure Functions timer trigger is a swap-in replacement — the endpoint contract is identical.

**Required secrets** (GitHub repo → Settings → Secrets and variables → Actions):
- `RENEWALS_ENDPOINT` = `https://www.revebatir.co.uk/api/admin/subscriptions/generate-renewals`
- `CRON_SECRET` = a long random string (e.g. `openssl rand -hex 32`)

**Required env var on Azure SWA** (Application settings):
- `CRON_SECRET` = same value as the GitHub secret

## B2 — Per-investor selective billing

**Endpoint**: `?userIds=u1,u2,u3` added to `generate-renewals`. When supplied, filters the subscription query to only those user IDs (still applies the horizon + recent-invoice idempotency check).

**UI**: `RenewalGeneratorButton` now renders a checkbox per subscriber in the dry-run preview:
- All checked by default
- Click a row to deselect → that user won't be billed
- "Select all / Deselect all" toggle
- Commit button label shows `Send N invoices` where N = selected count
- Disabled when nothing selected

Useful when a subscriber has a billing dispute mid-cycle and you want to skip them this round.

## B1 — Investor-side subscription requests

**Endpoint**: `POST /api/portal/subscription/request`
- Body: `{ type: UPGRADE | CHANGE_MONTHLY | CHANGE_ANNUAL | CANCEL, reason?: string }`
- Creates a Message scoped to the investor's application — subject is `[Subscription request] {label}`, body includes the request type + current subscription state + reason
- Sends an in-portal notification to every admin user (`type: 'SUBSCRIPTION_REQUEST'`)
- Emails `RESEND_TO_EMAIL` with the request details + a link to the investor's admin page
- All three side-effects are non-fatal — the Message is the source of truth

**Why not direct self-service?** Money flow is solicitor/bank-transfer only — admin needs to verify a payment before activating, and cancellations may need a conversation about refunds/credits. The Message + notification flow keeps everything visible and auditable while avoiding the "investor cancelled by accident" footgun.

**UI**: `SubscriptionRequestForm` client component on `/portal/subscription`:
- FREE tier: shown in the Upgrade section with `allowedTypes={['UPGRADE']}`
- PREMIUM (not cancelled): shown below the current-tier card with `allowedTypes={['CHANGE_MONTHLY', 'CHANGE_ANNUAL', 'CANCEL']}`
- Collapsible: "Request a change" button opens an inline form (type select + optional reason textarea)
- On success: gold-bordered confirmation "Request sent. We'll be in touch shortly to confirm next steps." + `router.refresh()` after 1.2s

**Schema additions**: none. Notification type `SUBSCRIPTION_REQUEST` added to `NOTIFICATION_TYPES` in `src/lib/notifications.ts` (DB column is free-string).

## Tests (+12 over PR #5, total 368/368 pass)

- `tests/api/subscription-request.test.ts` — new (7 tests):
  - Auth (401 unauthenticated)
  - Type validation (400 invalid)
  - 404 when investor has no application
  - UPGRADE creates Message + notifies admin with `SUBSCRIPTION_REQUEST` type
  - CANCEL creates Message with correct subject when sub exists
  - Reason is optional
  - 2001-char reason rejected
- `tests/api/subscriptions.test.ts` — extended (+5 tests):
  - C1: Bearer `CRON_SECRET` accepted in place of session
  - C1: wrong Bearer token rejected when `CRON_SECRET` is set
  - C1: no Bearer accepted when `CRON_SECRET` env unset (failure-safe default)
  - B2: `?userIds=u1,u2,u3` adds `userId IN [...]` to the Prisma where clause
  - B2: no userId filter when param omitted

## Verification

- 368/368 tests pass (was 356)
- Production build clean — new `/api/portal/subscription/request` route + updated workflow file in `.github/workflows/`
- No schema migration

## Setup checklist

To activate the cron (else nothing breaks — the workflow just won't run productively):

1. Generate a secret: `openssl rand -hex 32` (or any 32+ char random string)
2. Azure SWA → Configuration → Application settings → Add `CRON_SECRET` = the value above → Save (auto-restarts)
3. GitHub → Settings → Secrets and variables → Actions → New repository secret:
   - `CRON_SECRET` = the same value
   - `RENEWALS_ENDPOINT` = `https://www.revebatir.co.uk/api/admin/subscriptions/generate-renewals`
4. Optional: Actions tab → "Weekly subscription renewals" → "Run workflow" with `dryRun=true` to verify end-to-end without billing anyone.

## What's open

- **C6 from audit** — InvoiceCounter schema push, awaiting Azure SQL firewall whitelist for IP `154.161.38.129`
- 9 MEDIUM + 6 LOW audit items — backlog
- Operational extras you might want: a notification-bell badge for SUBSCRIPTION_REQUEST messages on the admin nav, an admin filter on `/admin/subscriptions` to show only those with pending requests
