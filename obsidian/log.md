# Obsidian Log

Append-only record of vault updates.

## [2026-05-12] bugfix | Task 19 - Build Verification Fixes

- Created: `obsidian/Bug_Fixes/Task_19_Build_Verification_Fixes.md`
- Updated: `obsidian/index.md` — Added Task 19 entry to Bug Fixes section
- Key points: Four build-blocking issues resolved:
  1. Prisma v7 requires driver adapter — installed @prisma/adapter-mssql, updated prisma.ts and seed-admin.ts
  2. Edge Runtime + Prisma conflict — split auth config into edge-safe auth.config.ts
  3. useSearchParams needs Suspense — extracted LoginForm, wrapped in Suspense boundary
  4. Unused isFuture variable removed from StatusTimeline
- Result: 33 tests pass, production build succeeds, committed as a3ed785
- Source: [[2026-05-12-investor-platform-expansion]]

## [2026-05-12] setup | Task 5 - NextAuth v5 Config + Type Augmentation

- Created: `obsidian/Projects/Task_5_NextAuth_v5_Config.md`
- Created: `src/types/next-auth.d.ts` — Session (id, role) and JWT (id, role) type augmentation
- Created: `src/lib/auth.ts` — NextAuth config with Credentials provider, Zod validation, bcrypt comparison, JWT callbacks
- Created: `src/app/api/auth/[...nextauth]/route.ts` — Route handler re-exporting GET and POST from handlers
- Updated: `obsidian/index.md` — Added Task 5 entry to Projects section
- Key points: Stateless JWT sessions; Zod safeParse prevents invalid credentials from throwing; signIn page set to /login; prisma singleton from @/lib/prisma; bcrypt.compare against user.passwordHash.
- Source: [[2026-05-12-investor-platform-expansion]]

## [2026-05-12] snippet | Task 4 - Azure Blob Storage Helpers

- Created: `obsidian/Snippets/Task_4_Azure_Blob_Storage_Helpers.md`
- Created: `src/lib/azure-blob.ts` — uploadDocument and generatePresignedUrl functions
- Created: `tests/lib/azure-blob.test.ts` — 3 tests (upload, SAS URL, missing credentials)
- Updated: `obsidian/index.md` — Added Task 4 entry to Snippets section
- Key points: TDD approach — test written first (failed: module not found), then implementation added to make all 3 tests pass. Vitest 4.x constructor mock fix: arrow functions in mockImplementation replaced with regular function keyword. SAS token has 5-minute expiry with read-only permission.
- Source: [[2026-05-12-investor-platform-expansion]]

## [2026-05-12] snippet | Task 3 - Prisma Singleton Client

- Created: `obsidian/Snippets/Task_3_Prisma_Singleton_Client.md`
- Updated: `obsidian/index.md` — Added Task 3 entry to Snippets section
- Key points: Implemented singleton pattern using globalThis to prevent multiple PrismaClient instances during Next.js hot-reload in development. Used correct Prisma v7 import path (@/generated/prisma). Caches instance in non-production only. Committed with hash e8979e1.
- Source: [[2026-05-12-investor-platform-expansion]]

## [2026-05-12] setup | Task 2 - Write Full Prisma Schema

- Created: `obsidian/Projects/Task_2_Write_Prisma_Schema.md`
- Updated: `obsidian/index.md` — Added Task 2 entry to Projects section
- Key points: Replaced boilerplate schema with 5 models (User, InvestorProfile, Application, Document, StatusHistory). Migrated to Prisma v7 datasource config (URL in prisma.config.ts). Fixed cyclic referential actions. Generated Prisma Client successfully to src/generated/prisma. Committed with hash 8f49430.
- Source: [[2026-05-12-investor-platform-expansion]]

## [2026-05-12] query | Investor platform implementation plan written

- Created: `docs/superpowers/plans/2026-05-12-investor-platform.md`
- Key points: 19-task plan covering Prisma schema, NextAuth, onboarding wizard, investor portal, admin dashboard, email notifications, Azure Blob uploads. Full TDD with Vitest tests per API route.
- Source: [[2026-05-12-investor-platform-expansion]]

## [2026-05-12] ingest | Investor platform expansion project note created

- Created: `obsidian/Projects/2026-05-12-investor-platform-expansion.md`
- Key points: Documents the scope of the full platform expansion — KYC/AML onboarding flow, ops dashboard, status notifications. Brainstorming session initiated.
- Source: [[2026-05-11-realestate-codebase-understanding]]

## [2026-05-11] query | Codebase understanding captured

- Studied application structure, routes, UI composition, integrations, and tests.
- Wrote technical repository documentation in docs/codebase-understanding-2026-05-11.md.
- Added vault knowledge note: Knowledge/2026-05-11-realestate-codebase-understanding.md.
- Updated index with a Knowledge entry for discovery.

## [2026-05-12] setup | Task 1 - Install Dependencies and Initialize Prisma

- Created: `obsidian/Projects/Task_1_Install_Dependencies_Initialize_Prisma.md`
- Updated: `obsidian/index.md` — Added Task 1 entry to Projects section
- Key points: Installed 72 runtime packages (next-auth@beta, @prisma/client, bcryptjs, @azure/storage-blob, @react-email/components) and 39 dev packages (prisma, @types/bcryptjs). Initialized Prisma with SQL Server datasource. Added postinstall and seed:admin scripts to package.json. Committed with hash a7dfbdc.
- Source: [[2026-05-12-investor-platform-expansion]]
