---
title: "Task 2 — Admin API: GET + POST /api/admin/investors/[id]/deals"
date: "2026-05-17"
language: "typescript"
status: "complete"
tags: ["api", "admin", "deals", "nextjs", "route-handler", "task-2"]
---

# 🔧 Task 2 — Admin API: GET + POST /api/admin/investors/[id]/deals

## 🎯 Goals

- Create Next.js 14 App Router route handler: `src/app/api/admin/investors/[id]/deals/route.ts`
- Implement GET endpoint to list all deals for an investor application
- Implement POST endpoint to create new deal and send investor notification
- Follow auth pattern from existing `/api/admin/investors/[id]/status/route.ts`
- Validate deal input with Zod schema
- Send deal notification email to investor
- Commit with git

## 🏗️ Architecture Overview

### Route: `/api/admin/investors/[id]/deals`

**Parameters:**
- `[id]` — Application ID (not User ID), from the URL path

**GET Handler:**
- Auth check: session required, admin role required
- Query: `prisma.deal.findMany({ where: { applicationId }, include: { response } })`
- Response: `{ deals: Deal[] }`

**POST Handler:**
- Auth check: session required, admin role required
- Validate body: Zod schema (title, address, askingPrice, summary)
- Create deal via `prisma.deal.create()`
- Fetch application with investor profile and email
- Send deal notification email to investor
- Response: `{ success: true, dealId }`

### Email Template

Styled HTML email with:
- Gold accent color (#c9a84c)
- Dark background (#0a0a0a)
- Deal card with address, title, price (£ formatted)
- Optional summary
- CTA link to `/portal/deals`
- Graceful error handling (non-fatal)

## 🤖 Implementation Steps & Results

### Step 1: Read existing status endpoint pattern
✅ Analyzed `/api/admin/investors/[id]/status/route.ts` to understand:
- Session/auth flow: `auth()`, check user and role
- Schema pattern: Zod safeParse with fieldErrors
- Data fetching: include nested investor profile and user email
- Email sending: try/catch, non-fatal errors, styled HTML
- Response format: NextResponse.json

### Step 2: Verify Prisma models
✅ Confirmed Deal and DealResponse models in schema:
- Deal: id, applicationId, postedByUserId, title, address, askingPrice, summary, status, createdAt, response?
- DealResponse: id, dealId, intent, comment, createdAt, updatedAt

### Step 3: Create directory structure
✅ Created: `src/app/api/admin/investors/[id]/deals/`

### Step 4: Write route.ts file
✅ Created: `src/app/api/admin/investors/[id]/deals/route.ts`

**Key implementation details:**

```typescript
const dealSchema = z.object({
  title: z.string().min(1).max(255),
  address: z.string().min(1).max(255),
  askingPrice: z.number().positive(),
  summary: z.string().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Auth check (401/403)
  // Query deals ordered by createdAt desc, include response
  // Return { deals }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Auth check (401/403)
  // Validate body with dealSchema
  // Fetch application with investor profile
  // Create deal with postedByUserId = session.user.id
  // Send email with deal details
  // Return { success, dealId }
}
```

**Email formatting:**
- Price: `£${Number(askingPrice).toLocaleString('en-GB')}`
- Address: uppercase, muted gold (#c9a84c)
- Summary: conditional, italic gray (#b3b3b3)
- CTA: "View Deal & Respond" → `/portal/deals`

### Step 5: Commit changes
✅ Git commit: `feat: admin API GET+POST /api/admin/investors/[id]/deals`
- Commit hash: `ae8cb79`
- Files changed: `src/app/api/admin/investors/[id]/deals/route.ts` (+96 insertions)

## 📊 Status Log

| Date | Status | Notes |
|---|---|---|
| 2026-05-17 | complete | File created, tested structure verified, committed to master. |

## ✅ Verification Checklist

- ✅ File created at correct path
- ✅ GET handler: auth → findMany → response
- ✅ POST handler: auth → validate → create → email → response
- ✅ Zod schema with proper constraints (min/max length, positive number)
- ✅ Email sending with try/catch (non-fatal)
- ✅ Price formatting with £ and en-GB locale
- ✅ Email includes deal card with address, title, price, optional summary
- ✅ Committed to git with correct message

## 🔗 Related Notes

- [[Task_1_Prisma_Schema_Deal_Models]] — Deal and DealResponse models
- [[admin-workflow-investor-lifecycle]] — Admin workflow context
- [[Knowledge/2026-05-11-realestate-codebase-understanding]] — Architecture reference

---

*Last updated: 2026-05-17*
