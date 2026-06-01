---
title: Leads follow-ups — auto-sign-in after magic-link + welcome banner
date: 2026-06-01
language: TypeScript
status: complete
tags: [leads, auth, nextauth, ux, portal]
---

# Leads follow-ups — auto-sign-in after magic-link + welcome banner

Two known follow-ups for the Lead capture feature (shipped at commit `17bc6fe`).

## Problem

1. **No auto-sign-in.** After a converted lead set a password at `/auth/finish-setup`, the page redirected to `/portal/dashboard?welcome=1`. That route doesn't exist (real path is `/portal`) AND the user had no session cookie — middleware bounced them to `/login`, forcing them to retype credentials they had just created.
2. **No profile-completion banner.** Magic-link converted users land with placeholder profile fields (`addressLine1=''`, `city=''`, `postcode=''`, `buyerType='cash'`, `strategy='BTL'`). Plan called for a banner on `?welcome=1` prompting profile completion — never built.

## Solution

### Task A — Auto-sign-in (NextAuth v5 `signIn` from route handler)

- Added `email: string` to `ConvertResult` in `src/lib/leads/convert.ts`. On the magic-link path it's `lead.email.toLowerCase()`. On the auto-match path it's fetched from the existing user inside the transaction (falls back to lead email if the user row is gone).
- `src/app/api/auth/finish-setup/route.ts` now imports `signIn` from `@/lib/auth` and calls `signIn('credentials', { email: result.email, password: parsed.data.password, redirect: false })` after token redemption. Wrapped in `try/catch` — auto-sign-in failure is logged but non-fatal so the user can still log in manually if NextAuth's `authorize()` ever tightens guards (e.g. emailVerified, lockouts).
- Fixed redirect target on `src/app/auth/finish-setup/page.tsx`: `/portal/dashboard?welcome=1` → `/portal?welcome=1` (the real portal root).

### Task B — Welcome banner

- New `src/components/portal/WelcomeBanner.tsx` (client). Pattern mirrors `BccRuleBanner`: starts hidden to avoid hydration flash, useEffect resolves real state from `searchParams` + `localStorage`. Dismiss writes `portal.welcome-dismissed=true` AND strips the `?welcome` param via `router.replace` so a refresh doesn't briefly re-show before localStorage is read.
- Wired into `src/app/portal/page.tsx` immediately inside the root `<div>`.
- Copy: "Welcome to Rêve Bâtir." + "We've remembered the preferences you discussed with the team. Take a moment to complete your profile — address, mortgage details, source of funds — at your profile page." Link to `/portal/profile`.

## Tests

- `tests/api/auth-finish-setup.test.ts`: original 7 pass + 2 new (auto-sign-in called with correct args; auto-sign-in throw is non-fatal → still returns 200). Mocked `@/lib/auth` with `signIn: vi.fn(async () => undefined)`.
- `tests/lib/leads/convert.test.ts`: all 7 original tests still pass — `email` field added to result is additive.

```
Test Files  2 passed (2)
Tests  16 passed (16)
```

`npx tsc --noEmit` — no new errors in any touched file. Pre-existing errors in unrelated tests (`subscriptions.test.ts`, `impersonate.test.ts`, etc.) untouched.

## Files

- `src/lib/leads/convert.ts` — added `email` to `ConvertResult`; auto-match path fetches existing user email
- `src/app/api/auth/finish-setup/route.ts` — added auto-sign-in via `signIn('credentials', { redirect: false })`
- `src/app/auth/finish-setup/page.tsx` — fixed redirect target `/portal/dashboard` → `/portal`
- `src/components/portal/WelcomeBanner.tsx` — NEW
- `src/app/portal/page.tsx` — render `<WelcomeBanner />`
- `tests/api/auth-finish-setup.test.ts` — +2 tests, mock `@/lib/auth`

## Concerns

- NextAuth v5 beta `signIn` from a Route Handler is documented as supported with `redirect: false`. If a beta version regression breaks cookie setting, the catch swallows the error and the user falls back to manual login — they still know the password, so worst case is one extra step. Not data-loss.
- Dismissal is per-browser (localStorage). User won't see banner again on the same browser but may re-see it on another device. Acceptable for a profile-completion CTA.

📁 Save this note to: obsidian/Projects/2026-06-01-leads-followups-autosignin-welcomebanner.md
