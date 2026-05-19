---
title: "PR #4 — Audit hardening (H1, H2, H4, H8)"
date: "2026-05-19"
language: "typescript"
status: "complete-except-c6"
tags: [audit-followup, security, state-machine, xss]
---

# PR #4 — Audit hardening (H1, H2, H4, H8)

Closes four of the five remaining HIGH-priority audit items. **C6** (invoice numbering race — needs `InvoiceCounter` table) was blocked at schema push time by an Azure SQL firewall rule (my current IP not whitelisted) — deferred to a follow-up commit.

## H1 — JWT keeps working after `User.deletedAt`

**Where**: `src/lib/auth.ts`. NextAuth's `session` callback is now overridden in the Node-side config (auth.ts, not auth.config.ts which has to stay edge-safe for middleware) to re-validate that the user record is still active on every server-side `auth()` call.

**Behavior**:
- Wraps the edge-safe session callback from `authConfig`
- Queries `prisma.user.findUnique` for `deletedAt`
- If user is gone or soft-deleted, returns session with `user: undefined` — every authenticated route already checks `if (!session?.user?.id) return 401`, so the request short-circuits

**Trade-off**: adds one DB query per server-side `auth()` call. For SMB scale this is fine. If perf matters later, cache by token version with a 5-minute TTL.

**Helper added**: `src/lib/auth-helpers.ts` exports `getActiveSession()` — kept available for routes that want explicit defence-in-depth, though the callback handles the common path automatically.

## H2 — Property auto-creation isn't cleaned up on stage rollback

**Where**: `src/app/api/admin/deals/[dealId]/stage/route.ts` + new `src/app/api/admin/properties/[propertyId]/route.ts`.

**Behavior**:
- When a stage PATCH transitions FROM `COMPLETED` to anything else, the route checks `prisma.property.findUnique({ where: { dealId } })`.
- If a Property exists, returns 409 with `code: 'PROPERTY_EXISTS'` + `propertyId` + a message pointing at `DELETE /api/admin/properties/[propertyId]`.
- New admin-only DELETE endpoint actually performs the cleanup (cascades `PropertyDocument` via the existing schema relation) and writes an `PROPERTY_DELETED` audit event.

**Net effect**: an admin who clicks "rollback from COMPLETED" sees a clear blocking error rather than silently orphaning a Property in the investor's portfolio. The fix path is one extra API call.

## H4 — Stage transitions unenforced

**Where**: `src/lib/deal-stages.ts` (new `STAGE_TRANSITIONS` matrix + `canStageTransition` helper) + `src/app/api/admin/deals/[dealId]/stage/route.ts` (uses the helper).

**Matrix**:
```
PROPOSED        → OFFER_PENDING | FALLEN_THROUGH
OFFER_PENDING   → OFFER_ACCEPTED | PROPOSED | FALLEN_THROUGH   (PROPOSED is C8)
OFFER_ACCEPTED  → MEMO_OF_SALE | FALLEN_THROUGH
MEMO_OF_SALE    → CONVEYANCING | FALLEN_THROUGH
CONVEYANCING    → SURVEY | MORTGAGE | EXCHANGED | FALLEN_THROUGH   (skip-OK for cash)
SURVEY          → MORTGAGE | EXCHANGED | FALLEN_THROUGH
MORTGAGE        → EXCHANGED | FALLEN_THROUGH
EXCHANGED       → COMPLETED | FALLEN_THROUGH
COMPLETED       → (terminal)
FALLEN_THROUGH  → (terminal)
```

**Override flag**: stage PATCH body accepts `{ override: true, overrideReason: string }` for genuine edge cases (misclick recovery, data fix). When set, the matrix is bypassed but `overrideReason` is required and gets prepended to the history note as `[OVERRIDE] ${reason}` for audit.

**Same-stage updates** (e.g. just updating the deal-team contacts without changing stage) still pass through — `canStageTransition` is only consulted when `stageChanged`.

## H8 — Bank reference sanitisation + HTML escape

**Where**: `src/app/api/admin/invoices/[id]/route.ts` (Zod regex), `src/lib/html-escape.ts` (new helper), various email templates.

**Bank reference regex**: `/^[A-Za-z0-9 _\-/.,]{1,255}$/`. Rejects control characters, HTML tags, and other Unicode that could be reflected through receipt emails or PDF rendering.

**`escapeHtml(value)`**: small helper for the 5 HTML special characters. Applied to interpolated investor/admin-controlled strings in:
- Invoice receipt email (`paidReference`, `firstName`)
- Invoice sent email (`firstName`)
- Deal stage change email (`firstName`, `address`, `note`)
- Offer decision email (`firstName`, `address`, `vendorDecisionNote`)

Email-client XSS is low-risk in practice but the cost of fixing it is zero. Closes audit M7 too.

## Audit log additions

`src/lib/audit.ts` — two new canonical action codes:
- `PROPERTY_DELETED` — emitted from the new admin property DELETE endpoint
- `STAGE_OVERRIDE` — reserved for future use when the stage PATCH route starts recording the override as a separate audit event (currently the override marker is in the history note only)

## Tests (+30 over PR #3, total 345/345 pass)

- `tests/lib/deal-stages.test.ts` — new (14 tests): VALID_DEAL_STAGES + TERMINAL_STAGES integrity, `dealStageLabel`, `STAGE_TRANSITIONS` shape (every stage has an entry, terminals are empty, every non-terminal reaches FALLEN_THROUGH, OFFER_PENDING→PROPOSED exists for C8), `canStageTransition` (permits/forbids/same-stage/terminal/override).
- `tests/lib/html-escape.test.ts` — new (5 tests): the five special chars, null/undefined → empty, plain text passthrough, number coercion, ampersand-first ordering.
- `tests/api/deal-stage.test.ts` — extended (+6 cases): rejects PROPOSED→COMPLETED (INVALID_STAGE_TRANSITION), rejects exit-from-COMPLETED, allows override with reason, rejects override without reason, blocks COMPLETED rollback when Property exists (PROPERTY_EXISTS + propertyId returned), allows COMPLETED rollback with override when no Property.
- `tests/api/invoices.test.ts` — extended (+3 cases): rejects HTML chars in paidReference, rejects control chars, accepts a normal bank reference shape.

## Out of scope (still open from the audit)

- **C6** — Invoice numbering race needs the new `InvoiceCounter` schema pushed to Azure SQL. Schema is added to `prisma/schema.prisma` but `prisma db push` failed because my client IP wasn't allowed by the Azure SQL firewall. **Will land as a follow-up commit** once the firewall rule is added.
- **M-class / L-class items** — backlog (see [2026-05-18-deal-workflow-audit.md](../Knowledge/2026-05-18-deal-workflow-audit.md)).
- **L5 (audit on invoice + subscription mutations)** — added the canonical action codes but didn't wire them into the routes; can land alongside C6 to keep this PR focused.
