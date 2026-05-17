---
title: "Handoff Prompt — Rêve Bâtir Investor Platform (post 36-commit overhaul)"
date: "2026-05-17"
language: "general"
status: "current"
tags: [handoff, context, deployment, architecture]
---

# Handoff Prompt — Rêve Bâtir Investor Platform

Paste the section below into a fresh session.

---

## Project

- **Repo:** `C:\Users\DELL\source\repos\RealEstateWebSite`
- **Live URL:** https://www.revebatir.co.uk
- **Stack:** Next.js 14 App Router, Prisma v7 (Azure SQL/MSSQL via `@prisma/adapter-mssql`), NextAuth v5 (JWT, edge-safe config split), Resend (email), Azure Blob Storage, Azure Static Web Apps
- **Branch:** `master` (single-branch workflow — push triggers Azure deploy)
- **Git user:** maxwellcudjoe
- **Test runner:** Vitest (205 tests, all passing)

## What happened in the last session

36 commits, comprehensive end-to-end overhaul of the investor platform. Started from a gap analysis identifying ~40 gaps; closed 51 (some bonus capability added along the way).

**Phases shipped:**
- Phase 1 (Compliance + Security) — 7/7 ✅
- Phase 2 (Onboarding completeness) — 11/11 ✅
- Phase 3 (Deal Transaction post-acceptance) — 7/7 ✅
- Phase 4 (Discovery + Matching) — 5/5 ✅
- Phase 5 (Portfolio post-completion) — 4/4 ✅
- Phase 6 (KYC modernisation + cross-cutting) — 7/8 (only Passkeys remain)

**Latest commit:** `dfd6643` — "fix: neutral 'Sign In' label in navbar"

## What's live for investors

End-to-end journey:
1. Public site → browse deals (Contentful) → "Save to my portal" if signed in
2. Register via 5-step wizard (Account / Personal / Compliance / Criteria / Review) with CAPTCHA + AML + GDPR consent
3. Email verification gate (no auto sign-in)
4. Sign in (optional TOTP 2FA + recovery codes)
5. Land on `/portal` overview dashboard
6. Admin posts deals via `/admin/match` (auto-matches investors by area + strategy + budget)
7. Investor responds (ACCEPT / MORE_INFO / PASS)
8. ACCEPT unlocks `/portal/deals/[id]`:
   - 10-stage pipeline (PROPOSED → … → COMPLETED) with timeline + admin notes
   - Structured Offer form (amount, deposit %, financing, conditions)
   - Financial summary (SDLT with non-resident + Ltd surcharges)
   - Deal team handoff card
   - Per-deal documents room
   - Per-deal discussion thread
   - Viewing request/confirm flow
9. On COMPLETED → Property auto-creates in `/portal/properties`
10. Portfolio overview metrics + per-property doc archive (expiry traffic-light)
11. Everything emits in-portal notifications + emails

**Compliance:** UK MLR 2017 capture, PEP screening, source-of-funds, KYC re-review 18-month cycle, GDPR Article 17/20 (soft-delete + data export), full audit log with 19 action codes.

**Security:** Email verification, CAPTCHA + IP rate limit, account lockout, TOTP 2FA, HIBP password breach check, login activity log.

## Pending external setup (env vars in Azure SWA, never in source)

| Provider | Env vars to set | Status |
|---|---|---|
| Cloudflare Turnstile (CAPTCHA) | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | Code ready, graceful fallback |
| SumSub (KYC) | `KYC_PROVIDER=SUMSUB` + `SUMSUB_APP_TOKEN` + `SUMSUB_SECRET_KEY` + `SUMSUB_WEBHOOK_SECRET` (optional but recommended) | User has sandbox token in `C:\Users\DELL\OneDrive\Desktop\Sumub.txt` — needs to add to Azure config + configure webhook URL `{NEXTAUTH_URL}/api/webhooks/sumsub` |
| getaddress.io (postcode lookup) | `GETADDRESS_API_KEY` | User has key in `C:\Users\DELL\OneDrive\Desktop\getaddressye.txt` — needs to add to Azure config |

All three have graceful fallback (no break if keys missing).

## What's deferred — Task 6.8 (Passkeys / WebAuthn)

Not shipped. Reason: WebAuthn ceremonies need careful attention — challenge state, attestation verification, counter replay, NextAuth integration. Avoided rushing at end of long session. **Estimate: 1–2 days focused work.**

Scope:
- `npm i @simplewebauthn/server @simplewebauthn/browser`
- New `PasskeyCredential` model
- 4 API endpoints (register begin/complete + login begin/complete)
- `PasskeyManager` component on `/portal/security` (coexists with TOTP)
- "Sign in with passkey" button on `/login`
- NextAuth integration via short-lived signed token bridge

## Key files / architecture pointers

| Area | Key files |
|---|---|
| Schema | `prisma/schema.prisma` (424 lines, ~25 models) |
| Auth | `src/lib/auth.ts` (Credentials provider with TOTP gate, lockout, attempt logging), `src/lib/auth.config.ts` (edge-safe), `src/middleware.ts` (route protection) |
| Email helpers | `src/lib/resend.ts`, `src/lib/emails/verification.ts` |
| Audit + notifications | `src/lib/audit.ts`, `src/lib/notifications.ts` |
| KYC | `src/lib/kyc-provider.ts` (KycService interface), `src/lib/sumsub.ts` (SumSub client) |
| Deal lifecycle | `src/lib/deal-stages.ts`, `src/lib/deal-documents.ts`, `src/lib/match.ts` |
| Domain constants | `src/lib/property.ts`, `src/lib/strategies.ts`, `src/lib/target-areas.ts`, `src/lib/compliance.ts` |
| Financial calcs | `src/lib/sdlt.ts` (UK residential SDLT with surcharges) |
| Validation | `src/lib/password.ts` (complexity + HIBP), `src/lib/turnstile.ts`, `src/lib/rate-limit.ts`, `src/lib/login-tracking.ts`, `src/lib/totp.ts` |
| Investor portal | `src/app/portal/page.tsx` (dashboard), `src/app/portal/{deals,properties,security,profile,messages,notifications}/page.tsx` |
| Admin | `src/app/admin/{investors,match,audit}/page.tsx`, `src/app/admin/investors/[id]/deals/[dealId]/page.tsx` |
| Per-deal investor view | `src/app/portal/deals/[dealId]/page.tsx` — central post-acceptance home |

## Mandatory workflow

This repo uses an **obsidian-logging workflow** (see `CLAUDE.md`). Before any task:
1. Read `obsidian/index.md` (catalogue) + last 10 lines of `obsidian/log.md` (recent work)
2. Scan the active project folder
3. Classify the task and update the right note

End every response with: `📁 Save this note to: obsidian/[FOLDER]/[NOTE_TITLE].md`

## Known minor issues (non-blocking)

1. `src/app/api/admin/documents/[id]/review/route.ts` records audit using closest-fit action code (`DEAL_DOC_UPLOADED` / `DEAL_DOC_DELETED`) rather than dedicated `DEAL_DOC_REVIEWED` — works but could be a cleaner enum extension.
2. `prisma.config.ts` + `scripts/check-data.ts` show as untracked in `git status` (intentional dev-only).
3. Old/unused KYC document type `DRIVING_LICENCE` was removed from `VALID_DOC_TYPES` but the manual upload UI still has 3 fixed slots — fine for the manual path; SumSub-mediated path bypasses it entirely.

## Quick-start commands

```bash
npm run dev                              # local dev server on :3000
npx vitest run                           # full test suite
npm run build                            # production build (also runs typecheck + lint)
npx prisma db push                       # push schema to Azure SQL
npx prisma generate                      # regenerate Prisma client
npx tsx scripts/check-data.ts            # inspect production data
git push origin master                   # deploys to Azure
```

## Recommended next moves (pick one)

1. **6.8 Passkeys** — only Phase task left. ~1–2 days focused.
2. **Activate external services** — user adds the 3 env-var sets above; smoke-test SumSub flow + Turnstile + postcode lookup with real keys.
3. **Polish pass** — anything spotted on the live site after deployment.
4. **Marketing improvements** — homepage Hero copy refresh, deal photos on public Contentful side, blog content.

## Brief

You have full repo context. The original close-all-gaps plan lives at `obsidian/Projects/2026-05-17-close-all-gaps-plan.md`. The gap analysis that drove it is at `obsidian/Knowledge/2026-05-17-buyer-journey-gap-analysis.md`. Read those + this handoff before starting new work.

Ship clean: tests pass, build clean, vault updated, push to master. Never commit secrets.
