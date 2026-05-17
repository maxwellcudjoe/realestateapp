---
title: "Task 1.3 — CAPTCHA + Rate Limit on /api/onboarding"
date: "2026-05-17"
language: "TypeScript / Next.js"
status: complete
tags: [security, anti-abuse, phase-1, R2, turnstile]
---

# Task 1.3 — CAPTCHA + Rate Limit

Closes gap **R2** (open `/api/onboarding` is a spam magnet). Adds two layers:
in-memory IP rate limit (immediate effect) and Cloudflare Turnstile CAPTCHA
(activates when env keys are set).

## Files

| File | Purpose |
|---|---|
| `src/lib/turnstile.ts` | Server-side verify (graceful fallback when secret unset) |
| `src/lib/rate-limit.ts` | In-memory IP bucket — 5 requests / 15 min for onboarding |
| `src/app/api/onboarding/route.ts` | Rate limit + CAPTCHA gates before any DB work |
| `src/components/onboarding/StepReview.tsx` | Turnstile widget on final step, blocks submit |
| `src/app/onboarding/page.tsx` | Passes token through to API |
| `tests/lib/rate-limit.test.ts` | 7 tests — limit, bucket isolation, window reset, IP extraction |
| `tests/lib/turnstile.test.ts` | 5 tests — missing secret, missing token, success, rejection, network error |

## Graceful degradation

- If `TURNSTILE_SECRET_KEY` is unset (server) or `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset (client), CAPTCHA is skipped and a warning is logged. **Production keeps working** while keys are being provisioned in Azure.
- Rate limit works immediately with no external dependencies.

## Setup checklist (when ready to activate CAPTCHA)

1. Create a free Cloudflare Turnstile account at https://dash.cloudflare.com/?to=/:account/turnstile
2. Add site (Type: Managed) → record **Site key** and **Secret key**
3. In Azure Static Web Apps → Configuration → add:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY = <site key>`
   - `TURNSTILE_SECRET_KEY = <secret key>`
4. Redeploy. CAPTCHA widget appears automatically on the wizard's Review step.

## Rate limit details

- 5 attempts per 15 minutes per IP for `/api/onboarding`
- Returns `429` with `Retry-After` header on block
- Single-instance in-memory store — fine for Azure SWA. For multi-instance scale-out, swap `Map` for Upstash Redis.

## Verification

- Build: ✅ 32 pages
- Tests: ✅ 45/45 pass (was 33 — added 12)

## Gaps closed
- R2 ✅ CAPTCHA + rate limit
