---
title: "Task 1.7 — Account Lockout + Login Activity Log"
date: "2026-05-17"
language: "TypeScript / Next.js / Prisma"
status: complete
tags: [security, auth, phase-1, X2]
---

# Task 1.7 — Account Lockout + Login Activity Log

Closes gap **X2** (brute-force friendly, no visibility for the user). Adds
persistent login attempt tracking, IP-based lockout (5 fails / 15 min cooldown),
and a `/portal/security` activity table the investor can audit.

## Schema

```prisma
model LoginAttempt {
  id        String   @id @default(cuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  email     String   @db.NVarChar(255)
  ipAddress String   @db.NVarChar(64)
  success   Boolean
  reason    String?  @db.NVarChar(50)
  createdAt DateTime @default(now())

  @@index([email, createdAt])
  @@index([ipAddress, createdAt])
  @@index([userId, createdAt])
}
```

- `userId` nullable so we can record attempts against email addresses that
  don't exist (would otherwise leak account existence). `onDelete: SetNull`
  preserves history if a user deletes their account.
- Three composite indexes for the common query shapes (per-email, per-IP, per-user).

## Lockout logic

- 5 failed attempts from same IP in last 15 min → all further attempts return null silently
- "unknown" IPs are not subject to lockout (would lock out legitimate users behind shared infra)
- Failure is logged with a reason: `no-user | bad-password | unverified | locked-out`
- Successful sign-in logged with `success=true`, `userId` populated

## Files

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | +LoginAttempt model |
| `src/lib/login-tracking.ts` | New — isIpLockedOut, recordLoginAttempt, recentAttemptsForUser |
| `src/lib/auth.ts` | Instrumented authorize() — lockout check + 5 logging points |
| `src/app/portal/security/page.tsx` | New — last 10 sign-in attempts table |
| `src/app/portal/layout.tsx` | +Security nav tab |
| `tests/lib/login-tracking.test.ts` | New — 8 tests |

## UX

`/portal/security` shows a 3-column table: timestamp, IP, result (with
specific failure reason in muted text). Invites the user to reset their
password if they spot anything suspicious. Will gain TOTP enrolment in
Task 1.6 and password-change in Task 2.9.

## Resilience properties

- `recordLoginAttempt` swallows errors — a logging failure must never block sign-in
- Lockout check sits before the bcrypt comparison so a flood of bad guesses doesn't burn CPU
- Lockout is silent (returns null) — does not distinguish from regular bad-password, preventing IP enumeration

## Verification

- Build: ✅ 33 pages (+`/portal/security`)
- Tests: ✅ 63/63 pass (was 55, added 8)

## Gaps closed
- X2 ✅ Account lockout + login activity log
