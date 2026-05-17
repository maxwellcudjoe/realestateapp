---
name: Investor Deal Feedback
description: Full CRUD deal response feature — admin posts deals, investors respond with intent + comment, email notifications both ways
type: project
---

## Overview

Two-sided deal communication: admins post property deals to investors via a dedicated page, investors respond with structured intent (Accept / More Info / Pass) and optional comment. Full CRUD on investor responses (create, read, update, delete).

## What Was Built

### Prisma Models
- **Deal** — admin-authored (applicationId, title, address, askingPrice, summary, status, postedByUserId)
- **DealResponse** — investor-authored (dealId unique, intent, comment, createdAt, updatedAt)
- One-to-one: Deal has optional DealResponse

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/investors/[id]/deals` | GET | List all deals for application |
| `/api/admin/investors/[id]/deals` | POST | Create deal, email investor |
| `/api/portal/deals` | GET | Investor's deals with responses |
| `/api/portal/deals/[dealId]/response` | POST | Create response, email admin |
| `/api/portal/deals/[dealId]/response` | PUT | Update response |
| `/api/portal/deals/[dealId]/response` | DELETE | Withdraw response |

All investor routes verify deal.applicationId matches the session user's application (cross-investor guard).

### UI Components

- **DealCard** — 4-state inline form (view / responding / editing / confirmDelete)
- **DealsClient** — renders DealCard list, router.refresh() on mutations, empty state
- **AdminPostDealForm** — form with title, address, price (comma-stripped), summary
- `/portal/deals` — server page, Deals tab between Documents and Messages
- `/admin/investors/[id]/deals` — two-column: post form + posted deals list
- "View Deals →" link on `/admin/investors/[id]`

### Email Notifications
- Admin posts deal → investor: "A new deal has been matched to your profile"
- Investor responds → admin: "Deal response: [intent] — [deal title]"

## Commits
- `6e59ee5` — Prisma schema (Deal + DealResponse)
- `ae8cb79` — Admin API GET+POST
- `fe7a7cc` — Investor GET /api/portal/deals
- `cbffa25` — Investor POST+PUT+DELETE response
- `faa7f6a` — DealCard component
- `f259359` — Portal deals page + nav tab
- `7b7c363` — Admin deals page + View Deals link

## Why
Investors at DEAL_SENT status had no way to express interest or feedback on deals. This gives them a structured, auditable way to respond and gives admin visibility into investor intent across all posted deals.
