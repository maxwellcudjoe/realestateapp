---
title: "Task 1.5 — Password complexity + HIBP + marketing consent"
date: "2026-05-17"
language: "TypeScript / Next.js / Prisma"
status: complete
tags: [security, gdpr, phase-1, R7, R8]
---

# Task 1.5 — Password complexity + HIBP + marketing consent

Closes gaps **R7** (marketing consent fused with privacy) and **R8** (weak
password policy). Adds strong password validation, HIBP "Pwned Passwords"
breach check, a UX strength meter, and a separate optional GDPR-compliant
marketing opt-in.

## Schema

`InvestorProfile.marketingConsentAt DateTime?` — null = no consent.
Pushed via `prisma db push` (8.29s).

## Password policy

| Rule | Enforced where |
|---|---|
| 8+ characters | Zod (client + server) |
| Lowercase letter | Zod |
| Uppercase letter | Zod |
| Number | Zod |
| Symbol (non-alphanumeric) | Zod |
| Not in any known breach | HIBP k-anonymity check (server-side) |

Applied at both `/api/onboarding` and `/api/auth/reset-password`. Password
change page (when built in Task 2.9) will inherit the same rules.

## HIBP integration

`src/lib/password.ts → checkPasswordBreached()`:
- SHA-1 hashes the password
- Sends only the first **5 hex chars** to `api.pwnedpasswords.com/range/{prefix}`
- Cloudflare returns ~600 suffixes with breach counts
- Local match → blocked with the breach count in the error message
- Network failure → fail-safe (treats as not breached; complexity rules still gate)

## Strength meter

`src/components/onboarding/PasswordStrengthMeter.tsx` — 4 segments with
colour ramp (red → amber → yellow → gold). Live update as user types in
StepAccount.

## Marketing consent

- Optional 5th checkbox on StepReview, styled muted to distinguish from required ones
- `InvestorProfile.marketingConsentAt = new Date()` if checked, else null
- UK GDPR / PECR compliant (separate explicit opt-in, not bundled with privacy)

## Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | +`marketingConsentAt` |
| `src/lib/password.ts` | New — complexity, strength, HIBP |
| `src/lib/schemas/onboarding.ts` | passwordSchema with regex rules; agreedToMarketing optional bool |
| `src/components/onboarding/PasswordStrengthMeter.tsx` | New — 4-bar meter |
| `src/components/onboarding/StepAccount.tsx` | Mounts strength meter |
| `src/components/onboarding/StepReview.tsx` | Marketing checkbox + marketing type added |
| `src/app/onboarding/page.tsx` | agreedToMarketing in agreements state |
| `src/app/api/onboarding/route.ts` | HIBP check + persists marketingConsentAt |
| `src/app/api/auth/reset-password/route.ts` | Same password rules + HIBP |
| `tests/lib/password.test.ts` | New — 9 tests (complexity, strength, HIBP) |
| `tests/lib/onboarding-schemas.test.ts` | Updated passwords to satisfy new rules; +1 test |
| `tests/api/onboarding.test.ts` | Mocked password/turnstile/rate-limit helpers |

## Verification

- Build: ✅ 32 pages
- Tests: ✅ 55/55 pass (was 45 — added 10)

## Gaps closed
- R7 ✅ Separate marketing consent
- R8 ✅ Stronger password (complexity + breach check + strength meter)
