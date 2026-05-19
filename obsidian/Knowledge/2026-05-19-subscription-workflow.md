---
title: "Subscription workflow — upgrade, downgrade, renewals, and the implementation plan to close known gaps"
date: "2026-05-19"
language: "general"
status: "documented + plan-ready"
tags: [subscriptions, premium-tier, workflow, plan, phase-7-followup]
---

# Subscription workflow — current state + implementation plan

End-to-end documentation of how Premium tier upgrades, downgrades, plan changes, and renewals work in the platform today (after PR #1's `effectiveTier` fix and PR #4's audit hardening), plus a sequenced implementation plan for the five known gaps.

---

## Mental model

Two distinct concepts:

| Concept | Field | Set when | Cleared when |
|---|---|---|---|
| **Stored tier (intent)** | `User.tier` (`FREE` \| `PREMIUM`) | Admin activates Premium | Never auto-cleared; only changed by another admin action |
| **Subscription state** | `Subscription.cancelledAt`, `nextRenewalAt` | Admin activates / cancels | n/a |
| **Effective tier (runtime)** | computed by `effectiveTier(user)` | Every tier check at read-time | n/a |

The key insight from audit C7: `User.tier` is the admin's *intent* ("this person paid us") and never auto-demotes. The `effectiveTier` helper combines tier + subscription state to compute what the user effectively gets right now. Cancellation only sets `Subscription.cancelledAt`; the tier remains effectively PREMIUM until `nextRenewalAt` passes.

### Effective tier truth table

| `User.tier` | `Subscription.cancelledAt` | `Subscription.nextRenewalAt` vs now | `effectiveTier()` |
|---|---|---|---|
| FREE | n/a | n/a | **FREE** |
| PREMIUM | null (active) | any | **PREMIUM** |
| PREMIUM | set | future | **PREMIUM** (paid-up cancelled) |
| PREMIUM | set | past | **FREE** (period expired after cancel) |
| PREMIUM (any subscription state — overdue renewal not cancelled) | null | past | **PREMIUM** (admin still needs to bill them) |

Source: `src/lib/subscriptions.ts:60-83`.

---

## The 5 workflows

### 1. Upgrade FREE → PREMIUM (admin-initiated)

**Trigger**: investor messages admin asking to upgrade → admin verifies bank transfer received.

**Steps**:
1. Admin opens `/admin/investors/[id]` — the `SubscriptionPanel` component (`src/components/admin/SubscriptionPanel.tsx`) shows current tier chip (FREE).
2. Admin clicks **"Activate Premium"**.
3. Inline form: pick MONTHLY or ANNUAL, set amount (defaults from `REVE_BATIR_PREMIUM_MONTHLY` / `_ANNUAL` env, else 49/499).
4. Submit → `POST /api/admin/subscriptions/[userId]` with `{ billingPeriod, amount }`.
5. Server (`src/app/api/admin/subscriptions/[userId]/route.ts`):
   - Validates admin role
   - In a `$transaction`:
     - `User.tier = 'PREMIUM'`
     - Creates Subscription row (`startedAt = now`, `nextRenewalAt = nextRenewalDate(now, period)`, `cancelledAt = null`)
   - Sends welcome email mentioning the 48h Premium head-start
6. `router.refresh()` in the panel — admin sees the new state immediately.

**Investor side**: gets the welcome email, sees PREMIUM tier on `/portal/subscription`, the 48h FREE-tier gate no longer applies to them on `/portal/deals`.

### 2. Downgrade PREMIUM → FREE (cancellation)

**Trigger**: admin decides to cancel (investor request, non-payment, mutual agreement).

**Steps**:
1. Admin opens `/admin/investors/[id]` → SubscriptionPanel shows PREMIUM + billing/renewal info.
2. Admin clicks **"Cancel subscription"** → `confirm()` dialog.
3. `DELETE /api/admin/subscriptions/[userId]`.
4. Server (post-PR #1 behaviour):
   - 409 if already cancelled
   - Sets `Subscription.cancelledAt = now`
   - **Does NOT touch `User.tier`** — investor keeps PREMIUM access until `nextRenewalAt` passes.
5. `router.refresh()` — admin sees "Premium (cancelled — access until {date})".

**Investor side**: `/portal/subscription` shows the cancelled-but-active state ("Premium (cancelled — ends 2026-06-19)"). All Premium features keep working until the renewal date passes; on the next page load after that, `effectiveTier` returns FREE and the 48h gate re-engages.

### 3. Plan change MONTHLY ↔ ANNUAL or reactivate cancelled-in-period

**Trigger**: investor wants to switch billing period, or wants to undo a cancellation while still inside the paid period.

**Steps**: identical to upgrade — admin clicks "Activate Premium" (or "Change plan" when active), picks new period/amount, submits. The same POST route runs `prisma.subscription.update` if a row exists.

**⚠ Gotcha (audit C7 follow-up, deferred)**: the update wipes `cancelledAt` and **resets `nextRenewalAt = now + newPeriod`**. Mid-period plan changes lose whatever days were left in the prior period — refund/credit risk for the investor.

### 4. Renewal billing (manual today)

**Trigger**: admin remembers to bill (weekly cadence works for most subscribers).

**Steps**:
1. Admin calls `POST /api/admin/subscriptions/generate-renewals?days=7` (currently no UI button — see Plan A1 below).
2. Server (`src/app/api/admin/subscriptions/generate-renewals/route.ts`):
   - Finds active (not cancelled) subs with `nextRenewalAt ≤ now + horizon`
   - For each subscriber:
     - **Skip** if SENT/PAID SUBSCRIPTION invoice issued in last 25 days (idempotency)
     - Create SUBSCRIPTION invoice (`RB-YYYY-NNNN`, `status = SENT`, `amount = sub.amount`, `dueAt = now + 14 days`)
     - Advance `nextRenewalAt` by one billing period
     - Email investor with the invoice
3. Response: `{ created: [...], skipped: [...], total: N }`.

**Investor pays**: bank transfer using the reference on the PDF → admin manually marks invoice PAID via the admin invoices page → receipt email sent.

### 5. Investor-side subscription view (read-only today)

Investor at `/portal/subscription` (`src/app/portal/subscription/page.tsx`):
- Sees current tier (computed via `effectiveTier`)
- If PREMIUM: billing amount, period, next renewal date (or "Access ends {date}" when cancelled)
- If FREE: monthly/annual pricing cards, message: *"To upgrade, message us via the Messages tab or email hello@revebatir.co.uk"*
- No self-serve buttons for cancel / change / upgrade — all action goes through admin via Messages.

---

## Schema involved

```prisma
model User {
  tier  String  @default("FREE") @db.NVarChar(20)   // FREE | PREMIUM (intent)
  subscription  Subscription?
  // ...
}

model Subscription {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(...)
  billingPeriod   String    @default("MONTHLY") @db.NVarChar(20)
  amount          Decimal   @db.Decimal(10, 2)
  startedAt       DateTime
  cancelledAt     DateTime?
  nextRenewalAt   DateTime
  @@index([nextRenewalAt])
}
```

Schema-level rule: one Subscription per user (`@unique` on userId). Cancellation never deletes the row — `cancelledAt` is the soft flag, and the row persists for history/reactivation.

---

## Code surface map

| Concern | File |
|---|---|
| Tier computation | `src/lib/subscriptions.ts` (`effectiveTier`, billing helpers) |
| Tier-gated deal queries | `src/lib/deal-access.ts` (uses `effectiveTier` for the visibility filter) |
| Admin API: activate/change | `POST /api/admin/subscriptions/[userId]` |
| Admin API: cancel | `DELETE /api/admin/subscriptions/[userId]` |
| Admin API: renewals | `POST /api/admin/subscriptions/generate-renewals` |
| Admin UI | `src/components/admin/SubscriptionPanel.tsx` (embedded on `/admin/investors/[id]`) |
| Investor UI | `src/app/portal/subscription/page.tsx` |
| Investor renewals — paying | `/portal/invoices` → click invoice → PDF with bank details |

---

## Known gaps + implementation plan

Five gaps in the workflow. Sequenced by leverage/effort.

### Phase A — Quick wins (no schema, ~2 hours total)

#### A1. Admin button for "Generate renewals"  ·  ~30 min  ·  HIGH leverage

**Problem**: the endpoint exists but only an API call. Admin has to remember + manually curl/console. Forgetting = no invoices = no money.

**Fix**:
1. Add a `RenewalGeneratorButton` client component at `src/components/admin/RenewalGeneratorButton.tsx`:
   - Two inputs: horizon (days, default 7) + a dry-run toggle
   - Calls `POST /api/admin/subscriptions/generate-renewals?days=N&dryRun=true|false`
   - Shows the result: "Created N invoices, skipped M" with the list of investors hit
2. Add a `dryRun` query param to the endpoint:
   - When `dryRun=true`, runs the same query + skip logic but doesn't create invoices or advance `nextRenewalAt` — returns the preview list only
3. Embed the button on a new admin dashboard widget at `/admin/investors` (top of page) — or its own simple page `/admin/subscriptions` listing all active subscriptions with renewal dates.
4. Tests: extend `tests/api/subscriptions.test.ts` with dry-run + endpoint coverage (currently tests only DELETE).

**Files touched**: 2 new (component + route param), 1 modified (admin investors page or new admin page), 1 test extended.

#### A2. Plan-change preserves in-period balance  ·  ~1 hour  ·  MEDIUM leverage

**Problem**: changing a subscriber from MONTHLY to ANNUAL mid-month loses their remaining paid days.

**Fix** in `POST /api/admin/subscriptions/[userId]`:
```ts
// If reactivating a cancelled sub that hasn't expired yet, OR changing plan mid-period:
const stillInPeriod = user.subscription && user.subscription.nextRenewalAt > now
const renewal = stillInPeriod
  ? user.subscription.nextRenewalAt          // keep the existing period end
  : nextRenewalDate(now, period)             // fresh period
```

Edge cases to handle:
- Period change MONTHLY → ANNUAL mid-month: keep prior `nextRenewalAt`, then jump to annual cadence at next renewal? Or extend by 1 year minus remaining days?
- Reactivation: only restore `cancelledAt = null`, keep `nextRenewalAt` as-is
- Amount change: keep period the same, just update `amount`

Simplest correct rule: **never set `nextRenewalAt` backwards**. If admin's POST would set it earlier than the current value, keep the current value instead.

**Tests**: extend `tests/api/subscriptions.test.ts` with:
- "reactivating a cancelled-in-period sub preserves nextRenewalAt"
- "plan change mid-period does not shorten access"
- "plan change after expiry sets a fresh period"

**Files touched**: 1 (POST route logic + tests).

### Phase B — UX completeness (~½ – 1 day total)

#### B1. Investor-side cancel / plan-change requests via Messages  ·  ~½ day

**Problem**: investor must email — friction + nothing recorded in-portal.

**Fix**:
1. On `/portal/subscription`, add a button **"Request a change"** that opens an inline form:
   - Radio: Cancel subscription / Change to MONTHLY / Change to ANNUAL / Upgrade to Premium (FREE only)
   - Optional reason textarea
2. Submit calls a new endpoint `POST /api/portal/subscription/request`:
   - Creates a `Message` linked to the investor's application (no `dealId`) with a structured subject like `[Subscription request] Cancel`
   - Body includes the requested change + reason
   - Notifies admin via `createNotification` + email
3. Admin sees the request in the existing Messages tab + as a notification — actions it manually via SubscriptionPanel.

**Tests**: new `tests/api/subscription-request.test.ts` covering auth, valid request types, message persistence, notification.

**Files touched**: 1 new component slot in `/portal/subscription/page.tsx`, 1 new endpoint, 1 new test file.

#### B2. Renewal generator: dry-run preview UI + per-investor confirm  ·  ~½ day  ·  LOW leverage if A1 is done

**Problem**: A1 gives a button + dry-run, but the result is still "process all". Sometimes you want to bill some subscribers and not others.

**Fix**: extend the RenewalGeneratorButton to render the dry-run preview as a list with checkboxes — admin selects which subscribers to bill, then clicks "Send invoices to selected". Calls the endpoint with `{ userIds: [...] }`.

Honestly, often the bulk action is fine; this is polish. Defer until you actually hit a case where you want per-investor control.

### Phase C — Automation (deferred until needed)

#### C1. Azure Functions cron for weekly renewal generation  ·  ~½ day  ·  Needs Azure Functions setup

**Problem**: someone has to remember to click the button.

**Fix**:
1. Add an Azure Functions project (out-of-tree from the SWA, or as the API portion of a Functions-backed SWA setup).
2. Timer trigger weekly (e.g. Monday 09:00 UTC).
3. Calls the same `generate-renewals` endpoint with the SWA admin service-principal credentials (or a server-to-server HMAC).
4. Alerts to admin if the run failed (Application Insights alert rule).

**When to do this**: once subscriber count crosses ~20 or you find yourself forgetting weekly. Until then, A1 is enough.

#### C2. Stripe/GoCardless integration (out of scope per locked product decision)

Not in plan — solicitor-only money flow is the product decision.

---

## Recommended sequencing

| Order | Item | Effort | Why first |
|---|---|---|---|
| 1 | **A1** Generate-renewals admin button + dry-run | ~30 min | Highest leverage; revenue mechanism that's currently API-only |
| 2 | **A2** Plan-change preserves period | ~1 hour | Refund/trust risk that you'll hit the first time someone wants to switch period |
| 3 | **B1** Investor-side request flow | ~½ day | Removes email friction; closes the loop on the cancellation UX |
| 4 | **B2** Per-investor selective billing | ~½ day | Only if A1 turns out to be too coarse in practice |
| 5 | **C1** Azure Functions cron | ~½ day | Only when subscriber count justifies — until then A1 is enough |

A1 + A2 together = ~1.5 hours; the natural batch for a single PR.

---

## Related notes

- [[2026-05-17-task-7-4-premium-tier]] — original Premium tier implementation
- [[2026-05-19-pr1-phase7-leak-plugs]] — `effectiveTier` helper introduced; cancellation no longer auto-demotes
- [[2026-05-18-deal-workflow-audit]] — C7 finding that drove the cancellation fix
