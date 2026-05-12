---
title: "Bug: Prisma v7 Build Failures — Constructor, Edge Runtime, Suspense"
date_logged: 2026-05-12
date_resolved: 2026-05-12
language: TypeScript
status: Resolved
severity: Critical
related_project: 2026-05-12-investor-platform-expansion
tags:
  - bug
  - typescript
  - prisma
  - next-auth
  - edge-runtime
---

# 🐛 Bug: Prisma v7 Build Failures — Constructor, Edge Runtime, Suspense

## 🚨 Error Messages

### Error 1: PrismaClient constructor requires arguments
```
./src/lib/prisma.ts:9:3
Type error: Expected 1 arguments, but got 0.
>  9 |   new PrismaClient()
```

### Error 2: Edge Runtime cannot import node: modules
```
./node_modules/.prisma/client/index-browser.js
Module not found: Can't resolve 'node:crypto'
Module not found: Can't resolve 'node:fs'
```

### Error 3: useSearchParams without Suspense
```
⨯ useSearchParams() should be wrapped in a suspense boundary at page "/login"
```

### Error 4: Unused variable lint error
```
StatusTimeline.tsx: 'isFuture' is assigned but never used
```

---

## 🗺️ Context

| Field | Value |
|---|---|
| **Project** | [[2026-05-12-investor-platform-expansion]] |
| **Files** | `src/lib/prisma.ts`, `src/middleware.ts`, `src/lib/auth.ts`, `src/app/login/page.tsx`, `src/components/portal/StatusTimeline.tsx` |
| **Language** | TypeScript |
| **Environment** | Local dev, `next build` production compilation |
| **Runtime** | Next.js 14.2.35, Prisma 7.8.0, Node.js |

---

## 🔬 Root Cause Analysis

### Error 1: Prisma v7 removed implicit datasource connections
In Prisma v7, `new PrismaClient()` no longer reads `DATABASE_URL` from the environment automatically. The constructor now requires either:
- `adapter` (a driver adapter like `@prisma/adapter-mssql` for direct connections), OR
- `accelerateUrl` (for Prisma Accelerate proxy)

The generated type is a discriminated union — one of these MUST be provided.

### Error 2: Middleware imports Prisma transitively
`src/middleware.ts` → `auth.ts` → `prisma.ts` → Prisma Client → `node:crypto`, `node:fs` etc.
Middleware runs on the Edge Runtime which has no access to `node:` built-in modules.

### Error 3: Next.js 14 static generation + useSearchParams
`useSearchParams()` triggers client-side rendering bail-out during static generation. Next.js 14 requires it to be wrapped in `<Suspense>`.

### Error 4: Dead code
`isFuture` was computed but never referenced in the JSX template.

---

## ✅ Fixes Applied

### Fix 1: Install @prisma/adapter-mssql and use adapter pattern

```typescript
// Before (broken)
import { PrismaClient } from '@/generated/prisma/client'
export const prisma = new PrismaClient()

// After (fixed)
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaMssql } from '@prisma/adapter-mssql'

function createPrismaClient() {
  const adapter = new PrismaMssql(process.env.DATABASE_URL!)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()
```

### Fix 2: Split auth config for Edge compatibility

Created `src/lib/auth.config.ts` (edge-safe, no Prisma dependency):
```typescript
import type { NextAuthConfig } from 'next-auth'
export const authConfig = {
  session: { strategy: 'jwt' as const },
  pages: { signIn: '/login' },
  callbacks: { jwt({...}), session({...}) },
  providers: [],
} satisfies NextAuthConfig
```

Updated `src/lib/auth.ts` to spread `authConfig` and add the Credentials provider.
Updated `src/middleware.ts` to import from `auth.config.ts` instead of `auth.ts`.

### Fix 3: Suspense boundary for useSearchParams

```typescript
// Extracted LoginForm component with useSearchParams
function LoginForm() { ... }

// Wrapped in Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <LoginForm />
    </Suspense>
  )
}
```

### Fix 4: Removed unused variable

Deleted `const isFuture = i > currentIndex` from StatusTimeline.tsx.

### Additional fixes:
- Fixed import path: `@/generated/prisma` → `@/generated/prisma/client` (Prisma v7 has no index.ts)
- Added `@prisma/adapter-mssql` to `serverComponentsExternalPackages` in next.config.mjs
- Excluded `scripts/` from tsconfig to avoid type-checking seed scripts against Next.js
- Added `/src/generated/prisma` to .gitignore

---

## 🔍 What I Learned

- Prisma v7 fundamentally changed connection management — `DATABASE_URL` is no longer read implicitly. You MUST use a driver adapter (`@prisma/adapter-mssql` for SQL Server) or Prisma Accelerate.
- NextAuth v5 split-config pattern: `auth.config.ts` (edge-safe callbacks only) + `auth.ts` (full node config with providers) is the standard approach when middleware needs auth.
- Always check transitive imports when using Edge Runtime — anything middleware touches must be free of `node:` module dependencies.

---

## 🔗 Related Notes & References

- [[2026-05-12-investor-platform-expansion]]
- [Prisma v7 Migration Guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [@prisma/adapter-mssql on npm](https://www.npmjs.com/package/@prisma/adapter-mssql)
- [NextAuth v5 Edge Compatibility](https://authjs.dev/guides/edge-compatibility)

---

## 📊 Resolution Log

| Date | Action | By |
|---|---|---|
| 2026-05-12 | All 4 bugs logged | Claude |
| 2026-05-12 | Root cause identified and fixes applied | Claude |
| 2026-05-12 | Build verified: 33 tests pass, production build succeeds | Claude |
| 2026-05-12 | Committed: a3ed785 | Claude |

---

*Status: **Resolved** | Logged: 2026-05-12*
