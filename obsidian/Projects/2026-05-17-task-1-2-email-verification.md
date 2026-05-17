---
title: "Task 1.2 — Email Verification + Verify-Before-Sign-In"
date: "2026-05-17"
language: "TypeScript / Next.js / Prisma"
status: complete
tags: [auth, security, compliance, phase-1, R1, R3]
---

# Task 1.2 — Email Verification + Verify-Before-Sign-In

Closes gaps **R1** (no email verification) and **R3** (auto sign-in before
verification) from the buyer-journey gap analysis. Eliminates the account-takeover
risk where an attacker could register with a victim's email and immediately
hold an active session.

## Schema

```prisma
model User {
  // ...existing fields
  emailVerifiedAt DateTime?
  // ...
  emailVerificationTokens EmailVerificationToken[]
}

model EmailVerificationToken {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String    @unique @db.NVarChar(255)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
}
```

Pushed via `npx prisma db push` (5.22s). Mirrors the existing
`PasswordResetToken` pattern exactly.

## Backfill

`scripts/backfill-email-verified.ts` — grandfathers all existing users
(`emailVerifiedAt = now()`) so the new sign-in gate doesn't lock anyone out
on deployment. Backfilled 5 users on first run.

## Files

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Added field + model |
| `scripts/backfill-email-verified.ts` | One-shot grandfather script |
| `src/lib/emails/verification.ts` | Shared HTML email template |
| `src/app/api/auth/verify-email/request/route.ts` | POST — request/resend |
| `src/app/api/auth/verify-email/[token]/route.ts` | GET — consume token, redirect to /login |
| `src/app/verify-email-sent/page.tsx` | "Check your inbox" landing page |
| `src/lib/auth.ts` | Reject sign-in when `emailVerifiedAt` null (admins exempt) |
| `src/app/api/onboarding/route.ts` | Create token + send verification email (was: welcome) |
| `src/app/onboarding/page.tsx` | Removed auto sign-in; redirect to /verify-email-sent |
| `src/app/login/page.tsx` | Success banner on ?verified=1, error banner on ?verifyError=, resend link |
| `tests/api/onboarding.test.ts` | Updated mock to include `emailVerificationToken.create` |
| `tests/api/verify-email.test.ts` | 4 new tests for resend endpoint |

## Flow

1. Investor submits onboarding wizard.
2. `POST /api/onboarding`: creates User + InvestorProfile + Application **+ EmailVerificationToken** in one transaction. Sends verification email (24h TTL).
3. Investor redirected to `/verify-email-sent?email=foo@bar` with resend option.
4. Investor clicks email link → `GET /api/auth/verify-email/[token]` → sets `User.emailVerifiedAt`, marks token used, redirects to `/login?verified=1`.
5. Login page shows gold success banner. Investor signs in.
6. NextAuth `authorize()` checks `emailVerifiedAt` — null means reject (admins exempt). Sign-in proceeds normally for verified users.

## Security properties

- **No enumeration:** resend endpoint always returns 200, never reveals account state.
- **Token rotation:** requesting a resend invalidates all prior unused tokens.
- **One-time use:** consume endpoint marks `usedAt`. Replay → "already used" error.
- **24-hour expiry:** longer than password reset (1h) because users often check email later.
- **Admin exemption:** seeded admin accounts (no wizard, server-side only) bypass the gate so they're never locked out.

## Verification

- Build: ✅ 32 pages, includes new `/verify-email-sent`
- Tests: ✅ 33 pass (was 29 — added 4 for verify-email resend)
- Backfill: ✅ 5 existing users grandfathered

## Gaps closed
- R1 ✅ Email verification
- R3 ✅ Verify-before-sign-in (auto sign-in removed)
