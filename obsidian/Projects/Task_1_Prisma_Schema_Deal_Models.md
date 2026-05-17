---
title: "Task 1 — Prisma Schema: Add Deal and DealResponse Models"
date: "2026-05-17"
language: "typescript"
status: "complete"
tags: ["prisma", "schema", "deal-feature", "database", "task-1"]
---

# 🔧 Task 1 — Prisma Schema: Add Deal and DealResponse Models

## 🎯 Goals

- Add back-relations to User model: `postedDeals Deal[] @relation("AdminPostedDeals")`
- Add back-relation to Application model: `deals Deal[]`
- Create `Deal` model (property postings by admins to investors)
- Create `DealResponse` model (investor intent responses to deals)
- Push schema to Azure SQL via `npx prisma db push`
- Regenerate Prisma Client (`npx prisma generate`)
- Commit changes with git

## 🏗️ Schema Changes Summary

**Models Modified:**
- User model: added `postedDeals` back-relation
- Application model: added `deals` back-relation

**Models Added:**
- Deal: full property listing with admin, application, pricing, status tracking
- DealResponse: investor response with intent (e.g., INTERESTED, NOT_INTERESTED) and optional comment

## 🤖 Implementation Steps & Results

### Step 1: Read current schema
✅ Current schema.prisma contains 7 models: User, PasswordResetToken, InvestorProfile, Application, Document, StatusHistory, Message
- User model has `sentMessages` relation at line 21
- Application model has `messages` relation at line 66

### Step 2: Modify User model
✅ Added `postedDeals Deal[] @relation("AdminPostedDeals")` after `sentMessages` line
- File: `prisma/schema.prisma` (line 22)

### Step 3: Modify Application model
✅ Added `deals Deal[]` after `messages` line
- File: `prisma/schema.prisma` (line 67)

### Step 4: Append Deal and DealResponse models
✅ Added both new models at end of schema file (after Message model)

**Deal model schema:**
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

**DealResponse model schema:**
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

### Step 5: Execute database push
✅ Command: `npx prisma db push`
```
Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma\schema.prisma.
Datasource "db": SQL Server database

Your database is now in sync with your Prisma schema. Done in 5.83s
```
Result: Database synced successfully

### Step 6: Regenerate Prisma Client
✅ Command: `npx prisma generate`
```
Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma\schema.prisma.

✔ Generated Prisma Client (7.8.0) to .\src\generated\prisma in 113ms
```
Result: Client regenerated with Deal and DealResponse types

### Step 7: Commit changes
✅ Git commit: `feat: add Deal and DealResponse models to Prisma schema`
- Commit hash: `6e59ee5`
- Files changed: `prisma/schema.prisma` (+28 insertions)

## 📊 Status Log

| Date | Status | Notes |
|---|---|---|
| 2026-05-17 | complete | All steps executed successfully. Schema pushed to Azure SQL, client regenerated, changes committed. |

## 🔗 Related Notes

- [[Task_2_Write_Prisma_Schema]] — Foundation Prisma schema (User, Application, etc.)
- [[admin-workflow-investor-lifecycle]] — Admin workflow that uses deals feature

---

*Last updated: 2026-05-17*
