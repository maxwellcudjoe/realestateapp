# Investor Deal Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to post property deals to investors, and investors to respond with a structured intent + comment (full CRUD on their response).

**Architecture:** Two new Prisma models (`Deal`, `DealResponse`) with a one-to-one relation. Five API routes split between admin and portal namespaces. A server-rendered portal page passes serialised data to client components (`DealsClient` → `DealCard`) that handle inline form state and call `router.refresh()` after mutations. Admin gets a dedicated `/admin/investors/[id]/deals` page with a `AdminPostDealForm` client component.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma v7 + MSSQL (Azure SQL), NextAuth v5, Resend, Zod, Tailwind CSS

> **Important:** In all admin routes and pages, `[id]` = **Application ID** (not User ID). This matches the existing pattern in `/admin/investors/[id]/page.tsx` which uses `prisma.application.findUnique({ where: { id: params.id } })`.

---

## File Manifest

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `prisma/schema.prisma` | Add `Deal` + `DealResponse` models; back-relations on `User` and `Application` |
| Create | `src/app/api/admin/investors/[id]/deals/route.ts` | Admin: POST create deal, GET list deals |
| Create | `src/app/api/portal/deals/route.ts` | Investor: GET all deals for their application |
| Create | `src/app/api/portal/deals/[dealId]/response/route.ts` | Investor: POST create / PUT update / DELETE remove response |
| Create | `src/app/portal/deals/page.tsx` | Server page: fetches deals from Prisma, passes to DealsClient |
| Create | `src/components/portal/DealsClient.tsx` | Client wrapper: renders DealCard list, calls router.refresh() on mutation |
| Create | `src/components/portal/DealCard.tsx` | Client component: deal display + inline response form (4 states) |
| Create | `src/app/admin/investors/[id]/deals/page.tsx` | Admin deal page: post form + posted deals list |
| Create | `src/components/admin/AdminPostDealForm.tsx` | Client form: post new deal to admin API |
| Modify | `src/app/admin/investors/[id]/page.tsx` | Add "View Deals →" link below the status panel |
| Modify | `src/app/portal/layout.tsx` | Add "Deals" tab between Documents and Messages |

---

## Task 1: Prisma Schema — Deal + DealResponse models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add back-relations to User and Application models**

In `prisma/schema.prisma`, add one line to each existing model:

```prisma
model User {
  // ... existing fields ...
  sentMessages        Message[]            @relation("UserSentMessages")
  postedDeals         Deal[]               @relation("AdminPostedDeals")  // ← add this
}

model Application {
  // ... existing fields ...
  messages      Message[]
  deals         Deal[]                                                     // ← add this
}
```

- [ ] **Step 2: Append Deal and DealResponse models at end of schema**

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

- [ ] **Step 3: Push schema to Azure SQL**

```bash
npx prisma db push
```

Expected output ends with: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 4: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client (7.8.0) to .\src\generated\prisma`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Deal and DealResponse models to Prisma schema"
```

---

## Task 2: Admin API — GET + POST /api/admin/investors/[id]/deals

**Files:**
- Create: `src/app/api/admin/investors/[id]/deals/route.ts`

- [ ] **Step 1: Create the route file**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { z } from 'zod'

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
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const deals = await prisma.deal.findMany({
    where: { applicationId: params.id },
    orderBy: { createdAt: 'desc' },
    include: { response: true },
  })

  return NextResponse.json({ deals })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parsed = dealSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const app = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      investorProfile: {
        include: { user: { select: { email: true } } },
      },
    },
  })
  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

  const deal = await prisma.deal.create({
    data: {
      applicationId: params.id,
      postedByUserId: session.user.id,
      title: parsed.data.title,
      address: parsed.data.address,
      askingPrice: parsed.data.askingPrice,
      summary: parsed.data.summary,
    },
  })

  try {
    const firstName = app.investorProfile.firstName
    const investorEmail = app.investorProfile.user.email
    const priceFormatted = `£${Number(parsed.data.askingPrice).toLocaleString('en-GB')}`

    await sendEmail({
      to: investorEmail,
      subject: 'A new deal has been matched to your profile — Rêve Bâtir Realty',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0e8d8;padding:40px">
          <h1 style="color:#c9a84c;font-size:22px;font-weight:300">A new deal has been matched to your profile</h1>
          <p>Dear ${firstName},</p>
          <div style="margin:24px 0;padding:20px;background:#1a1a1a;border-left:2px solid #c9a84c">
            <p style="margin:0 0 8px;color:#c9a84c;font-size:12px;text-transform:uppercase;letter-spacing:0.1em">${parsed.data.address}</p>
            <p style="margin:0 0 8px;font-size:20px;font-weight:300">${parsed.data.title}</p>
            <p style="margin:0;color:#c9a84c;font-size:18px">${priceFormatted}</p>
            ${parsed.data.summary ? `<p style="margin:16px 0 0;color:#b3b3b3;font-size:14px">${parsed.data.summary}</p>` : ''}
          </div>
          <p>Log in to your investor portal to view the full details and submit your response.</p>
          <p><a href="${process.env.NEXTAUTH_URL}/portal/deals" style="color:#c9a84c;font-weight:bold">View Deal &amp; Respond →</a></p>
          <hr style="border:none;border-top:1px solid #1e1e1e;margin:24px 0"/>
          <p style="font-size:12px;color:#888">Rêve Bâtir Realty — Property Deal Sourcing</p>
        </div>
      `,
    })
  } catch (e) {
    console.error('Deal notification email failed (non-fatal):', e)
  }

  return NextResponse.json({ success: true, dealId: deal.id })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/investors/[id]/deals/route.ts
git commit -m "feat: admin API GET+POST /api/admin/investors/[id]/deals"
```

---

## Task 3: Investor API — GET /api/portal/deals

**Files:**
- Create: `src/app/api/portal/deals/route.ts`

- [ ] **Step 1: Create the route file**

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      investorProfile: {
        include: { application: { select: { id: true } } },
      },
    },
  })

  const applicationId = user?.investorProfile?.application?.id
  if (!applicationId) return NextResponse.json({ error: 'No application found' }, { status: 404 })

  const deals = await prisma.deal.findMany({
    where: { applicationId },
    orderBy: { createdAt: 'desc' },
    include: { response: true },
  })

  return NextResponse.json({ deals })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/portal/deals/route.ts
git commit -m "feat: investor API GET /api/portal/deals"
```

---

## Task 4: Investor API — POST + PUT + DELETE /api/portal/deals/[dealId]/response

**Files:**
- Create: `src/app/api/portal/deals/[dealId]/response/route.ts`

- [ ] **Step 1: Create the route file**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { z } from 'zod'

const VALID_INTENTS = ['ACCEPT', 'MORE_INFO', 'PASS'] as const

const responseSchema = z.object({
  intent: z.enum(VALID_INTENTS),
  comment: z.string().optional(),
})

const INTENT_LABEL: Record<string, string> = {
  ACCEPT: "Interested — let's proceed",
  MORE_INFO: 'Interested — need more info',
  PASS: 'Not interested — passing',
}

async function getDealForUser(dealId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      investorProfile: {
        include: { application: { select: { id: true } } },
      },
    },
  })
  const applicationId = user?.investorProfile?.application?.id
  if (!applicationId) return null

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { response: true },
  })
  if (!deal || deal.applicationId !== applicationId) return null
  return deal
}

export async function POST(
  req: NextRequest,
  { params }: { params: { dealId: string } },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deal = await getDealForUser(params.dealId, session.user.id)
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  if (deal.response) return NextResponse.json({ error: 'Response already exists — use PUT to update' }, { status: 409 })

  const body = await req.json()
  const parsed = responseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  await prisma.dealResponse.create({
    data: {
      dealId: params.dealId,
      intent: parsed.data.intent,
      comment: parsed.data.comment ?? null,
    },
  })

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { investorProfile: { select: { firstName: true, lastName: true } } },
    })
    const investorName = user?.investorProfile
      ? `${user.investorProfile.firstName} ${user.investorProfile.lastName}`
      : (session.user.email ?? 'Investor')
    const intentLabel = INTENT_LABEL[parsed.data.intent]

    await sendEmail({
      to: process.env.RESEND_TO_EMAIL!,
      subject: `Deal response: ${intentLabel} — ${deal.title}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0e8d8;padding:40px">
          <h1 style="color:#c9a84c;font-size:20px;font-weight:300">Deal response received</h1>
          <table style="font-size:13px;border-collapse:collapse;width:100%">
            <tr><td style="padding:6px 16px 6px 0;color:#888;width:100px">Investor</td><td>${investorName}</td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#888">Deal</td><td>${deal.title}</td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#888">Response</td><td style="color:#c9a84c;font-weight:bold">${intentLabel}</td></tr>
          </table>
          ${parsed.data.comment ? `<div style="margin-top:20px;padding:16px;background:#1a1a1a;border-left:2px solid #c9a84c"><p style="margin:0">${parsed.data.comment}</p></div>` : ''}
          <hr style="border:none;border-top:1px solid #1e1e1e;margin:24px 0"/>
          <p style="font-size:12px;color:#888">Rêve Bâtir Realty — Investor Portal</p>
        </div>
      `,
    })
  } catch (e) {
    console.error('Deal response email failed (non-fatal):', e)
  }

  return NextResponse.json({ success: true })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { dealId: string } },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deal = await getDealForUser(params.dealId, session.user.id)
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  if (!deal.response) return NextResponse.json({ error: 'No response to update — use POST to create' }, { status: 404 })

  const body = await req.json()
  const parsed = responseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  await prisma.dealResponse.update({
    where: { dealId: params.dealId },
    data: { intent: parsed.data.intent, comment: parsed.data.comment ?? null },
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { dealId: string } },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deal = await getDealForUser(params.dealId, session.user.id)
  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  if (!deal.response) return NextResponse.json({ error: 'No response to delete' }, { status: 404 })

  await prisma.dealResponse.delete({ where: { dealId: params.dealId } })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/api/portal/deals/[dealId]/response/route.ts"
git commit -m "feat: investor API POST+PUT+DELETE /api/portal/deals/[dealId]/response"
```

---

## Task 5: DealCard — investor-facing deal card with inline response form

**Files:**
- Create: `src/components/portal/DealCard.tsx`

The card has four internal states: `view` | `responding` | `editing` | `confirmDelete`.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

const INTENT_OPTIONS = [
  { value: 'ACCEPT', label: "Interested — let's proceed" },
  { value: 'MORE_INFO', label: 'Interested — need more info' },
  { value: 'PASS', label: 'Not interested — passing' },
] as const

const INTENT_DISPLAY: Record<string, string> = {
  ACCEPT: "Interested — let's proceed",
  MORE_INFO: 'Interested — need more info',
  PASS: 'Not interested — passing',
}

interface DealResponseData {
  id: string
  intent: string
  comment: string | null
  createdAt: string
  updatedAt: string
}

export interface DealData {
  id: string
  title: string
  address: string
  askingPrice: number
  summary: string | null
  status: string
  createdAt: string
  response: DealResponseData | null
}

interface Props {
  deal: DealData
  onMutated: () => void
}

type CardState = 'view' | 'responding' | 'editing' | 'confirmDelete'

export function DealCard({ deal, onMutated }: Props) {
  const [cardState, setCardState] = useState<CardState>('view')
  const [intent, setIntent] = useState<string>(deal.response?.intent ?? '')
  const [comment, setComment] = useState<string>(deal.response?.comment ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const priceFormatted = `£${Number(deal.askingPrice).toLocaleString('en-GB')}`
  const postedDate = new Date(deal.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  function resetError() { setError('') }

  async function submitResponse() {
    if (!intent) return
    setSubmitting(true)
    resetError()
    try {
      const res = await fetch(`/api/portal/deals/${deal.id}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, comment: comment.trim() || undefined }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setCardState('view')
      onMutated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function updateResponse() {
    if (!intent) return
    setSubmitting(true)
    resetError()
    try {
      const res = await fetch(`/api/portal/deals/${deal.id}/response`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, comment: comment.trim() || undefined }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setCardState('view')
      onMutated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteResponse() {
    setSubmitting(true)
    resetError()
    try {
      const res = await fetch(`/api/portal/deals/${deal.id}/response`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setIntent('')
      setComment('')
      setCardState('view')
      onMutated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit() {
    setIntent(deal.response?.intent ?? '')
    setComment(deal.response?.comment ?? '')
    resetError()
    setCardState('editing')
  }

  return (
    <div className="border border-carbon p-6 space-y-5">
      {/* Deal header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone/60 mb-1">
            Posted {postedDate}
          </p>
          <h3 className="font-serif text-xl font-light text-ivory">{deal.title}</h3>
          <p className="font-sans text-xs text-stone mt-0.5">{deal.address}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone/60 mb-1">Asking Price</p>
          <p className="font-sans text-base text-gold">{priceFormatted}</p>
        </div>
      </div>

      {deal.summary && (
        <p className="font-sans text-xs text-stone leading-relaxed border-l-2 border-carbon pl-4 italic">
          {deal.summary}
        </p>
      )}

      {/* Response section */}
      <div className="border-t border-carbon pt-5">
        <p className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-4">Your Response</p>

        {/* No response, idle */}
        {!deal.response && cardState === 'view' && (
          <Button variant="secondary" onClick={() => setCardState('responding')}>
            Submit Response
          </Button>
        )}

        {/* Response form — create or edit */}
        {(cardState === 'responding' || cardState === 'editing') && (
          <div className="space-y-4">
            <div>
              <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">
                Your Intent
              </label>
              <select
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                className="w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory focus:outline-none focus:border-gold transition-colors"
              >
                <option value="" disabled>Select your response…</option>
                {INTENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">
                Comment (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Any questions or notes for the team…"
                className="w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors resize-none"
              />
            </div>
            {error && <p className="font-sans text-xs text-red-400">{error}</p>}
            <div className="flex gap-4">
              <Button
                variant="primary"
                onClick={cardState === 'editing' ? updateResponse : submitResponse}
                disabled={submitting || !intent}
              >
                {submitting ? 'Saving…' : cardState === 'editing' ? 'Update Response' : 'Submit Response'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => { setCardState('view'); resetError() }}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Existing response display */}
        {deal.response && cardState === 'view' && (
          <div className="space-y-3">
            <p className="font-sans text-sm font-medium text-ivory">
              {INTENT_DISPLAY[deal.response.intent] ?? deal.response.intent}
            </p>
            {deal.response.comment && (
              <p className="font-sans text-xs text-stone leading-relaxed">
                &ldquo;{deal.response.comment}&rdquo;
              </p>
            )}
            <p className="font-sans text-[0.55rem] uppercase tracking-widest text-stone/50">
              Responded {new Date(deal.response.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </p>
            <div className="flex gap-4 pt-1">
              <button
                onClick={startEdit}
                className="font-sans text-xs uppercase tracking-widest text-gold hover:text-ivory transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => { resetError(); setCardState('confirmDelete') }}
                className="font-sans text-xs uppercase tracking-widest text-stone hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Confirm delete */}
        {cardState === 'confirmDelete' && (
          <div className="space-y-3">
            <p className="font-sans text-xs text-stone">
              Are you sure you want to withdraw your response?
            </p>
            {error && <p className="font-sans text-xs text-red-400">{error}</p>}
            <div className="flex gap-4">
              <button
                onClick={deleteResponse}
                disabled={submitting}
                className="font-sans text-xs uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Deleting…' : 'Confirm Delete'}
              </button>
              <button
                onClick={() => { setCardState('view'); resetError() }}
                disabled={submitting}
                className="font-sans text-xs uppercase tracking-widest text-stone hover:text-ivory transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/portal/DealCard.tsx
git commit -m "feat: DealCard component with 4-state inline response form"
```

---

## Task 6: Portal Deals page + DealsClient + nav tab

**Files:**
- Create: `src/components/portal/DealsClient.tsx`
- Create: `src/app/portal/deals/page.tsx`
- Modify: `src/app/portal/layout.tsx`

- [ ] **Step 1: Create DealsClient**

```tsx
// src/components/portal/DealsClient.tsx
'use client'

import { useRouter } from 'next/navigation'
import { DealCard, DealData } from './DealCard'

interface Props {
  deals: DealData[]
}

export function DealsClient({ deals }: Props) {
  const router = useRouter()

  if (deals.length === 0) {
    return (
      <p className="font-sans text-sm text-stone">
        No deals have been posted to your profile yet. We&apos;ll notify you by email when one is ready.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} onMutated={() => router.refresh()} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create the portal deals page**

```tsx
// src/app/portal/deals/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { DealsClient } from '@/components/portal/DealsClient'

export const dynamic = 'force-dynamic'

export default async function PortalDealsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      investorProfile: {
        include: {
          application: {
            include: {
              deals: {
                orderBy: { createdAt: 'desc' },
                include: { response: true },
              },
            },
          },
        },
      },
    },
  })

  if (!user?.investorProfile?.application) {
    return <p className="font-sans text-sm text-stone">No application found.</p>
  }

  const deals = user.investorProfile.application.deals.map((d) => ({
    id: d.id,
    title: d.title,
    address: d.address,
    askingPrice: Number(d.askingPrice),
    summary: d.summary,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    response: d.response
      ? {
          id: d.response.id,
          intent: d.response.intent,
          comment: d.response.comment,
          createdAt: d.response.createdAt.toISOString(),
          updatedAt: d.response.updatedAt.toISOString(),
        }
      : null,
  }))

  return (
    <div>
      <h1 className="font-serif text-4xl font-light text-ivory mb-2">Deals</h1>
      <p className="font-sans text-sm text-stone mb-12">
        Property deals matched to your investment criteria. Respond to let us know your interest.
      </p>
      <DealsClient deals={deals} />
    </div>
  )
}
```

- [ ] **Step 3: Add Deals tab to portal layout nav**

In `src/app/portal/layout.tsx`, update `PORTAL_LINKS`:

```ts
const PORTAL_LINKS = [
  { href: '/portal/status', label: 'Status' },
  { href: '/portal/documents', label: 'Documents' },
  { href: '/portal/deals', label: 'Deals' },       // ← add this
  { href: '/portal/messages', label: 'Messages' },
]
```

- [ ] **Step 4: Commit**

```bash
git add src/components/portal/DealsClient.tsx src/app/portal/deals/page.tsx src/app/portal/layout.tsx
git commit -m "feat: investor portal /portal/deals page with Deals nav tab"
```

---

## Task 7: Admin deal posting page + link from investor detail

**Files:**
- Create: `src/components/admin/AdminPostDealForm.tsx`
- Create: `src/app/admin/investors/[id]/deals/page.tsx`
- Modify: `src/app/admin/investors/[id]/page.tsx`

- [ ] **Step 1: Create AdminPostDealForm client component**

```tsx
// src/components/admin/AdminPostDealForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

interface Props {
  applicationId: string
}

export function AdminPostDealForm({ applicationId }: Props) {
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [askingPrice, setAskingPrice] = useState('')
  const [summary, setSummary] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const price = parseFloat(askingPrice.replace(/,/g, ''))
    if (isNaN(price) || price <= 0) {
      setError('Asking price must be a positive number')
      return
    }
    setSubmitting(true)
    setError('')
    setSuccess(false)
    try {
      const res = await fetch(`/api/admin/investors/${applicationId}/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          address: address.trim(),
          askingPrice: price,
          summary: summary.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
      setTitle('')
      setAddress('')
      setAskingPrice('')
      setSummary('')
      setSuccess(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={255}
          placeholder="e.g. 2-bed terraced, Birmingham"
          className="w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors"
        />
      </div>
      <div>
        <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">Address</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          maxLength={255}
          placeholder="14 Maple Street, Birmingham, B1 1AA"
          className="w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors"
        />
      </div>
      <div>
        <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">Asking Price (£)</label>
        <input
          type="text"
          value={askingPrice}
          onChange={(e) => setAskingPrice(e.target.value)}
          required
          placeholder="185000"
          className="w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors"
        />
      </div>
      <div>
        <label className="block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2">Summary (optional)</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={4}
          placeholder="Two-bed mid-terrace, 7.2% gross yield, vacant possession, no chain."
          className="w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors resize-none"
        />
      </div>
      {error && <p className="font-sans text-xs text-red-400">{error}</p>}
      {success && <p className="font-sans text-xs text-gold">Deal posted — investor notified by email.</p>}
      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? 'Posting…' : 'Post Deal'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Create admin deals page**

```tsx
// src/app/admin/investors/[id]/deals/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { AdminPostDealForm } from '@/components/admin/AdminPostDealForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const INTENT_DISPLAY: Record<string, string> = {
  ACCEPT: 'Accepted',
  MORE_INFO: 'More Info',
  PASS: 'Passed',
}

export default async function AdminInvestorDealsPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const app = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      investorProfile: { select: { firstName: true, lastName: true } },
      deals: {
        orderBy: { createdAt: 'desc' },
        include: { response: true },
      },
    },
  })

  if (!app) redirect('/admin/investors')

  const fmt = (n: number) => `£${n.toLocaleString('en-GB')}`
  const p = app.investorProfile

  return (
    <div>
      <Link
        href={`/admin/investors/${params.id}`}
        className="font-sans text-xs uppercase tracking-widest text-stone hover:text-gold transition-colors mb-4 inline-block"
      >
        ← Back to {p.firstName} {p.lastName}
      </Link>
      <h1 className="font-serif text-4xl font-light text-ivory mb-8">
        Deals — {p.firstName} {p.lastName}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Post Deal form */}
        <div>
          <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-6">Post a Deal</h2>
          <AdminPostDealForm applicationId={params.id} />
        </div>

        {/* Posted deals list */}
        <div>
          <h2 className="font-sans text-[0.6rem] uppercase tracking-widest text-gold mb-6">
            Posted Deals ({app.deals.length})
          </h2>
          {app.deals.length === 0 ? (
            <p className="font-sans text-xs text-stone">No deals posted yet.</p>
          ) : (
            <div className="space-y-4">
              {app.deals.map((deal) => (
                <div key={deal.id} className="border border-carbon p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-sans text-sm font-medium text-ivory">{deal.title}</p>
                      <p className="font-sans text-xs text-stone mt-0.5">{deal.address}</p>
                      <p className="font-sans text-xs text-gold mt-1">{fmt(Number(deal.askingPrice))}</p>
                    </div>
                    <div
                      className={`flex-shrink-0 px-2 py-1 font-sans text-[0.55rem] uppercase tracking-widest border ${
                        deal.response
                          ? deal.response.intent === 'ACCEPT'
                            ? 'text-gold border-gold/30 bg-gold/5'
                            : deal.response.intent === 'MORE_INFO'
                            ? 'text-ivory border-carbon'
                            : 'text-stone border-carbon'
                          : 'text-stone/60 border-carbon/50'
                      }`}
                    >
                      {deal.response ? INTENT_DISPLAY[deal.response.intent] : 'Awaiting'}
                    </div>
                  </div>
                  {deal.response?.comment && (
                    <p className="font-sans text-xs text-stone italic border-l-2 border-gold/30 pl-3">
                      &ldquo;{deal.response.comment}&rdquo;
                    </p>
                  )}
                  <p className="font-sans text-[0.55rem] text-stone/50">
                    Posted {new Date(deal.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {deal.response && (
                      <> · Responded {new Date(deal.response.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add "View Deals →" link to existing investor detail page**

In `src/app/admin/investors/[id]/page.tsx`, add a link below the closing `</div>` of the 3-column grid:

```tsx
      </div>

      {/* Deals link — add after the closing </div> of the grid */}
      <div className="mt-8">
        <Link
          href={`/admin/investors/${params.id}/deals`}
          className="font-sans text-xs uppercase tracking-widest text-gold hover:text-ivory transition-colors"
        >
          View Deals →
        </Link>
      </div>
    </div>
  )
}
```

The full return block ends like this:

```tsx
  return (
    <div>
      <Link href="/admin/investors" ...>← Back to List</Link>
      <h1 ...>{p.firstName} {p.lastName}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ... existing 3 columns ... */}
      </div>

      <div className="mt-8">
        <Link
          href={`/admin/investors/${params.id}/deals`}
          className="font-sans text-xs uppercase tracking-widest text-gold hover:text-ivory transition-colors"
        >
          View Deals →
        </Link>
      </div>
    </div>
  )
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminPostDealForm.tsx "src/app/admin/investors/[id]/deals/page.tsx" "src/app/admin/investors/[id]/page.tsx"
git commit -m "feat: admin deal posting page and View Deals link on investor detail"
```

---

## Task 8: Build verification + push

**Files:** None

- [ ] **Step 1: Run production build**

```bash
npx next build
```

Expected: clean compile, `/portal/deals` and `/admin/investors/[id]/deals` appear in the route table, zero type errors, zero lint errors.

If lint errors appear — common causes:
- Unused import → remove it
- `any` type → replace with explicit type
- Unescaped entity in JSX → use `&apos;` / `&ldquo;` / `&rdquo;`

- [ ] **Step 2: Update obsidian vault**

Append to `obsidian/log.md`:

```
## [2026-05-17] feature | Investor Deal Feedback

- Created: obsidian/Projects/investor-deal-feedback.md
- Updated: obsidian/index.md — added Projects entry
- Prisma: added Deal + DealResponse models; pushed to Azure SQL
- Admin API: GET+POST /api/admin/investors/[id]/deals
- Investor API: GET /api/portal/deals, POST+PUT+DELETE /api/portal/deals/[dealId]/response
- UI: DealCard (4-state), DealsClient, /portal/deals page, /admin/investors/[id]/deals page
- Emails: investor notified on deal post; admin notified on investor response
- Nav: Deals tab added between Documents and Messages
- Build: clean. Committed and pushed to master.
```

Add entry to `obsidian/index.md` Projects table:
```
| [investor-deal-feedback](Projects/investor-deal-feedback.md) | Deal + DealResponse models, admin posting, investor CRUD responses, email notifications. |
```

Create `obsidian/Projects/investor-deal-feedback.md` with a summary of what was built.

- [ ] **Step 3: Git add all and push**

```bash
git add obsidian/
git commit -m "docs: update obsidian vault — investor deal feedback feature"
git push origin master
```

---

## Self-Review

**Spec coverage check:**
- ✅ Deal model (id, applicationId, postedByUserId, title, address, askingPrice, summary, status, createdAt)
- ✅ DealResponse model (id, dealId unique, intent, comment, createdAt, updatedAt)
- ✅ Back-relations on Application and User
- ✅ POST /api/admin/investors/[id]/deals — creates deal, emails investor
- ✅ GET /api/admin/investors/[id]/deals — lists deals + responses
- ✅ GET /api/portal/deals — investor fetches their deals
- ✅ POST /api/portal/deals/[dealId]/response — create, 409 if exists, emails admin
- ✅ PUT /api/portal/deals/[dealId]/response — update, 404 if not exists
- ✅ DELETE /api/portal/deals/[dealId]/response — remove response
- ✅ Cross-investor guard: `getDealForUser` checks deal.applicationId matches session user's app
- ✅ /portal/deals server page — force-dynamic, Prisma fetch, serialise Decimal→number, Date→ISO string
- ✅ DealsClient — router.refresh() on mutation, empty state message
- ✅ DealCard — 4 states: view / responding / editing / confirmDelete
- ✅ Intent options: ACCEPT / MORE_INFO / PASS with display labels
- ✅ /admin/investors/[id]/deals — server page with AdminPostDealForm + deals list
- ✅ AdminPostDealForm — price parsing (strip commas), success flash, router.refresh()
- ✅ "View Deals →" link on existing admin investor detail page
- ✅ "Deals" tab in portal layout between Documents and Messages
- ✅ Email: investor on deal post (dark theme, deal summary block)
- ✅ Email: admin on investor response (intent label bold gold, comment block)

**Type consistency check:**
- `DealData` interface exported from `DealCard.tsx` and imported by `DealsClient.tsx` — consistent
- `askingPrice` serialised as `Number(d.askingPrice)` in page → `number` in `DealData` → `toLocaleString` in card — consistent
- `intent` stored as `'ACCEPT' | 'MORE_INFO' | 'PASS'`, displayed via `INTENT_DISPLAY` map — consistent across card and admin page
- `getDealForUser` returns `Deal & { response: DealResponse | null }` — used for both existence checks and `.response` access — consistent
