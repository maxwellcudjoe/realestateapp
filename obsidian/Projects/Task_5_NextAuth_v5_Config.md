---
title: "Task 5 — NextAuth v5 Config with Credentials Provider and JWT Sessions"
date_created: 2026-05-12
last_updated: 2026-05-12
status: Active
tags:
  - project
  - typescript
---

# Task 5 — NextAuth v5 Configuration + Type Augmentation

## Goals

Configure NextAuth v5 (beta) for the investor platform:
- Augment Session and JWT types to include `id` and `role`
- Wire up a Credentials provider with Zod-validated email/password auth
- Use `bcryptjs` for password comparison against `user.passwordHash`
- Expose JWT id and role via session callback
- Register the NextAuth route handler at `/api/auth/[...nextauth]`

---

## Tasks

### Done
- [x] Create `src/types/next-auth.d.ts` — type augmentation for User, Session, JWT
- [x] Create `src/lib/auth.ts` — NextAuth config with Credentials provider
- [x] Create `src/app/api/auth/[...nextauth]/route.ts` — route handler
- [x] Commit all three files

---

## Architecture & Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Framework | Next.js 15 App Router |
| Auth | next-auth@5.0.0-beta.31 |
| Database | Prisma v7 + SQL Server via @/generated/prisma |
| Password | bcryptjs@3.0.3 |
| Validation | zod@3.25.76 |
| Session | JWT (stateless) |

---

## AI Prompts Used

### Prompt 1
**Date:** 2026-05-12
**Prompt:**
```
Implement Task 5: NextAuth v5 configuration + type augmentation.
Create src/types/next-auth.d.ts, src/lib/auth.ts, and route handler.
Use credentials provider, Zod validation, bcrypt password comparison, JWT sessions.
```
**Summary of Response:**
> Created all three files per spec. Type augmentation extends Session (id, role), JWT (id, role).
> Auth config uses Zod loginSchema for safe-parse before DB lookup. Prisma findUnique on email,
> bcrypt.compare against passwordHash. JWT callback stores id + role, session callback exposes them.
> Route handler re-exports handlers.GET and handlers.POST. All committed.

---

## Dev Notes & Decisions

- `session.strategy: 'jwt'` — stateless, no DB session table required
- `pages.signIn: '/login'` — custom login page to be built in later tasks
- Zod `loginSchema.safeParse` used (not `parse`) so invalid creds return `null` gracefully without throwing
- `user as any` cast in jwt callback needed because NextAuth's built-in User type doesn't include `role` until our augmentation is applied at the call site; the cast is safe because the authorize callback explicitly returns `{ id, email, role }`
- Prisma import path: `@/generated/prisma` (Prisma v7 convention)
- Prisma singleton: `@/lib/prisma`

---

## External References

- [NextAuth v5 docs](https://authjs.dev/getting-started/migrating-to-v5)
- [Credentials provider](https://authjs.dev/getting-started/providers/credentials)

---

## Status Log

| Date | Status | Notes |
|---|---|---|
| 2026-05-12 | Active | All three files created and committed |

---

*Last updated: 2026-05-12*
