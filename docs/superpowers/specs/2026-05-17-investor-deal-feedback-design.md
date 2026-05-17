# Investor Deal Feedback — Design Spec

**Date:** 2026-05-17  
**Project:** Rêve Bâtir Realty — Investor Portal  
**Status:** Approved

---

## Overview

When an admin sources a property deal matching an investor's criteria, they post a brief deal summary to the investor's portal page. The investor can then respond with a structured intent (dropdown) and an optional comment. The response is fully editable and deletable until the deal is closed by admin.

This is a two-sided feature: an admin deal-posting interface and an investor deal-response interface, connected by two Prisma models and five API routes.

---

## Data Layer

### `Deal` model (admin-authored)

```prisma
model Deal {
  id             String       @id @default(cuid())
  applicationId  String
  application    Application  @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  postedByUserId String
  postedByUser   User         @relation("AdminPostedDeals", fields: [postedByUserId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  title          String       @db.NVarChar(255)
  address        String       @db.NVarChar(255)
  askingPrice    Decimal      @db.Decimal(12, 2)
  summary        String?      @db.NVarChar(Max)
  status         String       @default("OPEN") @db.NVarChar(20)
  createdAt      DateTime     @default(now())

  response       DealResponse?
}
```

### `DealResponse` model (investor-authored)

```prisma
model DealResponse {
  id        String   @id @default(cuid())
  dealId    String   @unique
  deal      Deal     @relation(fields: [dealId], references: [id], onDelete: Cascade)
  intent    String   @db.NVarChar(30)
  comment   String?  @db.NVarChar(Max)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**`intent` values:** `ACCEPT` | `MORE_INFO` | `PASS`

**Back-relations added to existing models:**
- `Application`: `deals Deal[]`
- `User`: `postedDeals Deal[] @relation("AdminPostedDeals")`

---

## API Routes

All routes live under `src/app/api/`. Auth is enforced on every route via `auth()` from `@/lib/auth`.

### Admin routes (role must be `admin`)

#### `POST /api/admin/investors/[id]/deals`
- **Body:** `{ title: string, address: string, askingPrice: number, summary?: string }`
- **Validates** with Zod; `askingPrice` must be a positive number
- **Creates** a `Deal` record linked to the investor's `applicationId`
- **Emails** the investor: *"A new deal has been matched to your profile"* with deal summary and a link to `/portal/deals`
- **Returns** `{ success: true, dealId }`

#### `GET /api/admin/investors/[id]/deals`
- **`[id]`** is the investor's User id (consistent with existing `/admin/investors/[id]` pattern)
- **Returns** all deals for the investor's application, each including `response` if it exists
- Ordered by `createdAt` descending

### Investor portal routes (role must be `investor`, deal must belong to session user's application)

#### `GET /api/portal/deals`
- **Returns** all deals for the investor's application, ordered newest first
- Each deal includes its `DealResponse` (or `null` if not yet responded)

#### `POST /api/portal/deals/[dealId]/response`
- **Body:** `{ intent: 'ACCEPT' | 'MORE_INFO' | 'PASS', comment?: string }`
- **Guards:** deal belongs to session user's application; no existing response (otherwise 409)
- **Creates** `DealResponse`
- **Emails** admin: *"[Name] responded to [deal title] — [intent]"* with comment
- **Returns** `{ success: true }`

#### `PUT /api/portal/deals/[dealId]/response`
- **Body:** `{ intent, comment? }`
- **Guards:** deal belongs to session user; response exists (otherwise 404)
- **Updates** `DealResponse.intent` and `DealResponse.comment`, sets `updatedAt`
- **Returns** `{ success: true }`

#### `DELETE /api/portal/deals/[dealId]/response`
- **Guards:** deal belongs to session user; response exists
- **Deletes** `DealResponse` — deal reverts to "awaiting response" state
- **Returns** `{ success: true }`

---

## UI

### Investor Portal — `/portal/deals`

**Nav:** "Deals" tab added to `PORTAL_LINKS` in `src/app/portal/layout.tsx`, between Documents and Messages.

**Page structure (`src/app/portal/deals/page.tsx`):** Server component, `force-dynamic`. Fetches deals via Prisma directly (same pattern as `/portal/status`). Passes serialised data to `DealsClient`.

**`DealsClient` (`src/components/portal/DealsClient.tsx`):** Client component. Renders a list of `DealCard` components. Calls `router.refresh()` after any successful mutation.

**`DealCard` (`src/components/portal/DealCard.tsx`):** Client component. Two visual states:

*Awaiting response:*
```
┌──────────────────────────────────────────────────┐
│ POSTED 12 May 2026                    [OPEN]     │
│                                                  │
│ 14 Maple Street, Birmingham                      │
│ Asking Price: £185,000                           │
│                                                  │
│ "Two-bed mid-terrace, 7.2% gross yield,          │
│  vacant possession, no chain."                   │
│                                                  │
│ ── Your Response ──────────────────────────────  │
│  [Intent ▾]  [Comment...]  [Submit Response]     │
└──────────────────────────────────────────────────┘
```

*Responded:*
```
┌──────────────────────────────────────────────────┐
│ POSTED 12 May 2026                    [OPEN]     │
│                                                  │
│ 14 Maple Street, Birmingham                      │
│ Asking Price: £185,000                           │
│                                                  │
│ "Two-bed mid-terrace, 7.2% gross yield..."       │
│                                                  │
│ ── Your Response ──────────────────────────────  │
│  INTERESTED — NEED MORE INFO                     │
│  "Can you share the EPC and rental history?"     │
│  Responded 14 May 2026                           │
│                                         [Edit] [Delete]  │
└──────────────────────────────────────────────────┘
```

**Intent dropdown labels → stored values:**
| Label | Stored value |
|---|---|
| Interested — let's proceed | `ACCEPT` |
| Interested — need more info | `MORE_INFO` |
| Not interested — passing | `PASS` |

**Delete confirmation:** No modal. A "Confirm delete" button replaces the Delete button on first click; second click executes the DELETE request. Cancellable by clicking elsewhere.

**Empty state:** If no deals have been posted yet, show a brief message: *"No deals have been posted to your profile yet. We'll notify you by email when one is ready."*

---

### Admin — `/admin/investors/[id]/deals`

**Navigation:** A "View Deals →" link is added to the existing `/admin/investors/[id]` page, below the status panel.

**Page structure (`src/app/admin/investors/[id]/deals/page.tsx`):** Server component, `force-dynamic`. Auth-gated to `admin` role.

**Two sections:**

1. **Post a Deal** (top): Form with title, address, asking price (£), summary (optional). Submit creates the deal and emails the investor. Uses `Button` component.

2. **Posted Deals** (below): List of all deals for this investor. Each entry shows:
   - Title + address + price + date posted
   - Response status badge: `Awaiting` (stone) / `Accepted` (gold) / `More Info` (ivory) / `Passed` (stone/dim)
   - Investor's comment (if any)

---

## Email Notifications

| Trigger | Recipient | Subject |
|---|---|---|
| Admin posts deal | Investor | *"A new deal has been matched to your profile — Rêve Bâtir Realty"* |
| Investor responds (any intent) | Admin (`RESEND_TO_EMAIL`) | *"Deal response: [intent] — [deal title]"* |

Both emails use the existing dark-themed HTML template pattern from `src/lib/resend.ts`.

---

## File Manifest

```
prisma/schema.prisma                                  ← add Deal + DealResponse models

src/app/api/admin/investors/[id]/deals/route.ts       ← GET + POST (admin)
src/app/api/portal/deals/route.ts                     ← GET (investor)
src/app/api/portal/deals/[dealId]/response/route.ts   ← POST + PUT + DELETE (investor)

src/app/portal/deals/page.tsx                         ← server page
src/components/portal/DealsClient.tsx                 ← client wrapper
src/components/portal/DealCard.tsx                    ← deal card with inline form

src/app/admin/investors/[id]/deals/page.tsx           ← admin deal posting page
src/app/admin/investors/[id]/page.tsx                 ← add "View Deals →" link

src/app/portal/layout.tsx                             ← add Deals tab to nav
```

---

## Out of Scope

- Admin closing / locking a deal (`status: CLOSED`) — deferred
- Investor receiving multiple simultaneous deals in parallel (supported by schema, not explicitly surfaced in UI beyond the list)
- Deal attachments / file uploads
- Read receipts or deal view tracking
