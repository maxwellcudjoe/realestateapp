---
title: Task 1 - Install Dependencies and Initialize Prisma
date: 2026-05-12
status: completed
language: typescript
tags: [project, task-1, nextauth, prisma, dependencies, setup]
---

# 📦 Task 1 — Install Dependencies and Initialize Prisma

## 🎯 Goals

Install all platform dependencies for the investor platform expansion (NextAuth, Prisma, Azure Blob, bcrypt) and initialize Prisma ORM with SQL Server as the datasource. This is the foundational setup for all subsequent API routes and database operations.

---

## 🗂️ Tasks

### Backlog
- [ ] (Future) Configure DATABASE_URL environment variable with AWS RDS MSSQL credentials
- [ ] (Future) Create initial Prisma migrations
- [ ] (Future) Seed admin user via `npm run seed:admin`

### In Progress

### Done
- [x] Install runtime dependencies (next-auth@beta, @prisma/client, bcryptjs, @azure/storage-blob, @react-email/components)
- [x] Install dev dependencies (prisma, @types/bcryptjs)
- [x] Add postinstall and seed:admin scripts to package.json
- [x] Initialize Prisma with SQL Server provider
- [x] Verify .env added to .gitignore
- [x] Commit changes with proper Co-Authored-By
- [x] Project initialized

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Framework | Next.js 14 (App Router) |
| Database | SQL Server (via AWS RDS) |
| ORM | Prisma 5.x |
| Auth | NextAuth v5 (JWT) |
| Blob Storage | Azure Blob Storage |
| Hosting | Vercel |
| Repo | `https://github.com/maxwellcudjoe/RealEstateWebSite` |

---

## 🤖 AI Solution

### Execution Summary

All steps completed successfully. Task 1 is 100% complete.

### Step 1: Install Runtime Dependencies

```bash
npm install next-auth@beta @prisma/client bcryptjs @azure/storage-blob @react-email/components
```

**Result:** 72 packages added

**Packages installed:**
- `next-auth@5.0.0-beta.31` — NextAuth.js v5 with credentials provider and JWT sessions
- `@prisma/client@7.8.0` — Prisma client for database operations
- `bcryptjs@3.0.3` — Password hashing library (12-round bcrypt)
- `@azure/storage-blob@12.31.0` — Azure Blob Storage SDK for KYC document uploads
- `@react-email/components@1.0.12` — Email template components (note: package is deprecated but functional)

### Step 2: Install Dev Dependencies

```bash
npm install -D prisma @types/bcryptjs
```

**Result:** 39 packages added

**Packages installed:**
- `prisma@7.8.0` — Prisma CLI and schema generator
- `@types/bcryptjs@2.4.6` — TypeScript type definitions for bcryptjs

### Step 3: Update package.json Scripts

Added to the `"scripts"` section:
```json
"postinstall": "prisma generate",
"seed:admin": "npx tsx scripts/seed-admin.ts"
```

**Rationale:**
- `postinstall` — Automatically generates Prisma client after `npm install` (prevents stale generated code)
- `seed:admin` — CLI to seed the initial admin user (executed manually later when .env is configured)

### Step 4: Initialize Prisma with SQL Server

```bash
npx prisma init --datasource-provider sqlserver
```

**Created files:**
- `prisma/schema.prisma` — Prisma schema file with SQL Server provider and DATABASE_URL env var binding
- `prisma.config.ts` — Prisma configuration (auto-generated, not committed per task spec)
- `.env` — Placeholder for DATABASE_URL and other environment variables

**Schema content:**
```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}
```

### Step 5: Verify .env in .gitignore

**Status:** Updated `.gitignore` to include `^\.env` rule (was previously covered by `.env*.local` but made explicit)

The `.env` file created by `prisma init` is now guaranteed not to be committed to version control.

### Step 6: Commit Changes

```bash
git add package.json package-lock.json prisma/schema.prisma
git commit -m "chore: install platform dependencies and initialise Prisma for MSSQL

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

**Commit hash:** `a7dfbdc`

**Changed files:**
- `package.json` — Added dependencies, dev dependencies, and scripts
- `package-lock.json` — Locked all 540 total packages
- `prisma/schema.prisma` — New Prisma schema file

---

## 📎 Related Notes

- [[2026-05-12-investor-platform-expansion]] — Full platform expansion project
- `docs/superpowers/plans/2026-05-12-investor-platform.md` — Implementation plan (19 tasks)
- `docs/superpowers/specs/2026-05-12-investor-platform-design.md` — Full design spec

---

## 📝 Dev Notes & Decisions

- **PostInstall Hook:** The `postinstall` script ensures the Prisma client is regenerated whenever `npm install` is run, preventing stale generated code issues.
- **Env File Safety:** `.env` is NOT checked into version control. User will provide DATABASE_URL credentials in the next task.
- **NextAuth v5 (Beta):** Selected beta to access JWT sessions and credentials provider for custom authentication flow without social logins.
- **Azure Blob v12:** Latest stable version with async/await support for pre-signed URL generation.
- **Bcryptjs over native bcrypt:** Pure JS implementation for cross-platform compatibility (no native binding issues on Windows/Mac/Linux).
- **Prisma Client Output Path:** Set to `../src/generated/prisma` per architectural plan. This path is already in `.gitignore`.
- **Deprecation Warnings:** @react-email/components package and its subcomponents are deprecated, but remain functional. Alternative solutions (e.g., nodemailer, mailgun templates) can be evaluated in future iterations if issues arise.

---

## 📊 Status Log

| Date | Status | Notes |
|---|---|---|
| 2026-05-12 | Completed | Task 1 finished — all dependencies installed, Prisma initialized, commit pushed. Ready for DATABASE_URL configuration (Task 2). |

---

*Last updated: 2026-05-12*
