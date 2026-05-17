---
title: Prisma Singleton Client
date_created: 2026-05-12
language: TypeScript
use_case: Prevent multiple PrismaClient instances during Next.js hot-reload in development
related_project: Investor Platform Expansion
tags:
  - snippet
  - typescript
  - prisma
  - database
---

# 🧩 Prisma Singleton Client

## 📋 Overview

| Field | Value |
|---|---|
| **Function / Pattern** | PrismaClient singleton pattern |
| **Language** | TypeScript |
| **Use Case** | Create a single shared PrismaClient instance that persists across Next.js hot-reloads in development mode |
| **Related Project** | [[2026-05-12-investor-platform-expansion]] |
| **Source** | Prisma v7 best practices |

---

## 💻 Code

```typescript
import { PrismaClient } from '@/generated/prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## 🔍 How It Works

This pattern implements a singleton pattern using globalThis to store the PrismaClient instance:

1. **Type-safe global reference** — Extends globalThis with a typed prisma property that can hold a PrismaClient or undefined.
2. **Nullish coalescing operator** — Uses `??` to reuse the existing global instance if it exists, otherwise creates a new PrismaClient.
3. **Development-only caching** — Only caches the instance in globalThis during non-production environments. This prevents multiple PrismaClient instances from being created during Next.js hot-reloads, which would exhaust database connection pools.
4. **Logging configuration** — Logs only errors in both development and production to avoid noisy console output.
5. **Prisma v7 import** — Imports from `@/generated/prisma` (the generated client location) instead of `@prisma/client`.

---

## ✅ Use Case Example

> Use this singleton in any API route or server action that needs database access.

```typescript
// In an API route (app/api/users/route.ts)
import { prisma } from '@/lib/prisma'

export async function GET() {
  const users = await prisma.user.findMany()
  return Response.json(users)
}

// In a Server Action (lib/actions/user.ts)
'use server'
import { prisma } from '@/lib/prisma'

export async function createUser(data) {
  return await prisma.user.create({ data })
}
```

---

## ⚠️ Gotchas & Edge Cases

- **Import path critical** — Prisma v7 generates to a custom output path (`src/generated/prisma`). Using `@prisma/client` instead will cause import errors.
- **globalThis pollution** — In production, the instance is not cached on globalThis to avoid holding references across requests. In development, it is cached to prevent connection pool exhaustion from hot-reloads.
- **Module-level export** — The `prisma` export is instantiated at module load time. Every import gets the same singleton instance.

---

## 🔄 Variations

Alternative: Lazy initialization pattern (create client on first use rather than at module load):

```typescript
import { PrismaClient } from '@/generated/prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
    })
  }
  return globalForPrisma.prisma
}

export const prisma = getPrisma()
```

---

## 🤖 AI Context

**Prompt used:** Implementation task from investor platform expansion plan - create Prisma singleton client following Prisma v7 best practices with correct import path to generated client.

---

## 🔗 Related Snippets & Notes

- [[Task_2_Write_Prisma_Schema]] — The Prisma schema that generates the client
- [[2026-05-12-investor-platform-expansion]] — Parent project plan

---

*Created: 2026-05-12*
