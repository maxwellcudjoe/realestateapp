---
name: Portal Messaging Feature
description: Investor-to-admin messaging, admin note highlighting in status timeline, Messages tab in portal nav
type: project
---

## Overview

Added investor-side communication features to the Rêve Bâtir investor portal.

## What Was Built

### 1. Prisma — `Message` model
Added to `prisma/schema.prisma`:
```prisma
model Message {
  id            String      @id @default(cuid())
  applicationId String
  application   Application @relation(...)
  senderUserId  String
  senderUser    User        @relation("UserSentMessages", ...)
  subject       String      @db.NVarChar(255)
  body          String      @db.NVarChar(Max)
  createdAt     DateTime    @default(now())
}
```
- Back-relation added to `Application` (`messages Message[]`) and `User` (`sentMessages Message[] @relation("UserSentMessages")`)
- Pushed to Azure SQL with `prisma db push`, regenerated client

### 2. API Route — `/api/portal/messages`
- **GET**: Auth-gated (investor), returns all messages for the investor's application, newest first
- **POST**: Validates `{ subject, body }`, creates `Message` record, sends email to `RESEND_TO_EMAIL` (info@revebatir.co.uk) with gold-styled HTML template

### 3. Portal Messages Page
- `src/app/portal/messages/page.tsx` — server component, fetches messages from DB
- `src/components/portal/MessagesClient.tsx` — client wrapper, renders `MessageForm` + sent message list, calls `router.refresh()` after send
- `src/components/portal/MessageForm.tsx` — controlled form with subject + body, loading/sent/error states, uses `Button` component

### 4. Portal Layout Nav
Added `{ href: '/portal/messages', label: 'Messages' }` to `PORTAL_LINKS` in `src/app/portal/layout.tsx`.

### 5. StatusTimeline Admin Note Highlighting
Updated `src/components/portal/StatusTimeline.tsx` Activity Log section:
- Entry border changes from `border-carbon` to `border-gold/40` when a note is present
- Notes render in a distinct block: `bg-gold/5`, `border-l-2 border-gold`, italic ivory text, "Note from admin" label in small gold caps

## Commit
`3984893` — pushed to `maxwellcudjoe/realestateapp` master → triggers Azure deployment

## Why
Investors had no way to contact admin or see admin notes prominently. This adds a complete bidirectional communication surface while keeping all messages in the DB for a full audit trail.
