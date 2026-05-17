---
title: Task_2_Write_Prisma_Schema_Investor_Platform
date: 2026-05-12
language: prisma
status: complete
tags: [prisma, schema, investor-platform, sql-server, task-2]
---

# Task 2: Write Full Prisma Schema for Investor Platform

## 🎯 Goals
- Replace boilerplate Prisma schema with complete data model for investor onboarding
- Define 5 models: User, InvestorProfile, Application, Document, StatusHistory
- Ensure SQL Server compatibility (no native enums, use NVarChar strings)
- Run `npx prisma generate` to validate schema and output Prisma Client
- Commit schema with proper co-author message

---

## 🗂️ Tasks

### Done
- [x] Write full schema with 5 models (User, InvestorProfile, Application, Document, StatusHistory)
- [x] Replace entire contents of prisma/schema.prisma (removed old boilerplate)
- [x] Migrate to Prisma v7 datasource config (URL moved to prisma.config.ts)
- [x] Fix cyclic referential actions by setting explicit onDelete/onUpdate on StatusHistory.changedByUser
- [x] Run `npx prisma generate` to validate and generate Prisma Client to src/generated/prisma
- [x] Commit with hash 8f49430 and co-author message

---

## 🏗️ Architecture & Tech Stack

| Component | Technology |
|---|---|
| ORM | Prisma v7.8.0 |
| Database | SQL Server |
| Generator | prisma-client (not prisma-client-js) |
| Output | ../src/generated/prisma |
| Enum Type | String + @db.NVarChar (SQL Server limitation) |

---

## 🤖 AI Solution

### Final Schema Implementation

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "sqlserver"
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique @db.NVarChar(255)
  passwordHash String   @db.NVarChar(100)
  role         String   @default("investor") @db.NVarChar(20)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  investorProfile InvestorProfile?
  statusChanges   StatusHistory[]
}

model InvestorProfile {
  id           String   @id @default(cuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  firstName    String   @db.NVarChar(100)
  lastName     String   @db.NVarChar(100)
  phone        String   @db.NVarChar(50)
  addressLine1 String   @db.NVarChar(255)
  city         String   @db.NVarChar(100)
  postcode     String   @db.NVarChar(20)
  budgetMin    Decimal  @db.Decimal(12, 2)
  budgetMax    Decimal  @db.Decimal(12, 2)
  strategy     String   @db.NVarChar(20)
  buyerType    String   @db.NVarChar(20)
  targetAreas  String   @db.NVarChar(Max)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  application Application?
}

model Application {
  id                String   @id @default(cuid())
  investorProfileId String   @unique
  investorProfile   InvestorProfile @relation(fields: [investorProfileId], references: [id], onDelete: Cascade)
  status            String   @default("SUBMITTED") @db.NVarChar(30)
  adminNotes        String?  @db.NVarChar(Max)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  documents     Document[]
  statusHistory StatusHistory[]
}

model Document {
  id            String   @id @default(cuid())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  type          String   @db.NVarChar(30)
  fileName      String   @db.NVarChar(255)
  blobPath      String   @db.NVarChar(500)
  uploadedAt    DateTime @default(now())
  reviewStatus  String   @default("PENDING") @db.NVarChar(20)
}

model StatusHistory {
  id              String   @id @default(cuid())
  applicationId   String
  application     Application @relation(fields: [applicationId], references: [id], onDelete: Cascade, onUpdate: Cascade)
  fromStatus      String?  @db.NVarChar(30)
  toStatus        String   @db.NVarChar(30)
  changedByUserId String?
  changedByUser   User?    @relation(fields: [changedByUserId], references: [id], onDelete: NoAction, onUpdate: NoAction)
  note            String?  @db.NVarChar(Max)
  createdAt       DateTime @default(now())
}
```

### Key Implementation Details

**Prisma v7 Configuration Changes:**
- Removed `url = env("DATABASE_URL")` from datasource block in schema.prisma
- URL is now configured in `prisma.config.ts` (created during Task 1 initialization)
- Generator uses `prisma-client` provider (not `prisma-client-js`)

**SQL Server Compatibility:**
- All "enum-like" fields use `String @db.NVarChar(length)` since SQL Server lacks native enums
- Used `@db.NVarChar(Max)` for potentially large text fields (adminNotes, targetAreas, note)
- Decimal fields for currency use `@db.Decimal(12, 2)` for precision

**Referential Action Management:**
- Fixed cyclic referential action issue by setting explicit actions:
  - `StatusHistory.changedByUser`: `onDelete: NoAction, onUpdate: NoAction` (breaks the cycle)
  - `StatusHistory.application`: `onDelete: Cascade, onUpdate: Cascade` (cascades when app deleted)
  - Other cascade deletes on child models to parent

**Data Model Design:**
- **User**: Base authentication entity with email uniqueness, password hash, role (default "investor")
- **InvestorProfile**: Extended profile tied 1:1 to User; stores investment criteria, contact, budget
- **Application**: Tracks investor application with status lifecycle and admin notes
- **Document**: Stores uploaded KYC/AML documents with blob paths and review status
- **StatusHistory**: Audit trail of application status changes, includes who changed it and notes

---

## 📝 Dev Notes & Decisions

- **Cascading Deletes**: Designed to cascade from parent to children (User → InvestorProfile → Application → Documents/StatusHistory) but NOT in reverse to prevent circular deletions. Used NoAction on StatusHistory.changedByUser to break cycles.
- **Optional Fields**: Nullable fields include admin notes, status change history details, and system fields that may not always be present
- **Timestamps**: All models include createdAt (immutable) and updatedAt (auto-updated) for audit trails
- **Unique Constraints**: Email is unique on User, userId on InvestorProfile, and investorProfileId on Application (one application per profile)
- **String Enums**: All enum-like fields (role, status, strategy, buyerType, type, reviewStatus) stored as strings to support future changes without migrations

---

## 🔗 External References

- [Prisma v7 Config Migration](https://pris.ly/d/config-datasource)
- [Prisma Referential Actions](https://pris.ly/d/cyclic-referential-actions)
- [SQL Server Field Types in Prisma](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#sqlserver-type-mapping)

---

## 📊 Status Log

| Date | Status | Notes |
|---|---|---|
| 2026-05-12 | complete | Schema written, Prisma v7 config fixed, validation passed, client generated, committed (8f49430) |

---

*Last updated: 2026-05-12*
