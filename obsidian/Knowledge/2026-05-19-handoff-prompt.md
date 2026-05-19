---
title: "Handoff prompt — next session (2026-05-19)"
date: "2026-05-19"
language: "general"
status: "current"
tags: [handoff, session-boundary]
---

# Handoff Prompt — Rêve Bâtir Investor Platform

## Project

- **Repo**: `C:\Users\DELL\source\repos\RealEstateWebSite`
- **Live URL**: https://www.revebatir.co.uk
- **Stack**: Next.js 14 App Router · Prisma v7 (Azure SQL via `@prisma/adapter-mssql`) · NextAuth v5 (JWT, edge-safe config split) · Resend · Azure Blob Storage · Azure Static Web Apps
- **Branch**: `master` (single-branch — push triggers Azure deploy)
- **Tests**: Vitest, **374 passing**
- **Latest commit**: `476f7cb` (PR #8 — schema-blocked audit items)

## What happened last session

**15 commits across 8 PRs.** Phase 7 was already complete at session start (investor platform end-to-end). This session was a deep audit + remediation pass.

| # | Title | Commit | Audit items closed |
|---|---|---|---|
| 1 | Phase 7 leak plugs | `8d1dde7` | C3, C4, C5, C7, H6, H7 |
| 2 | Centralised deal-access with tier gate | `bfb6444` | C1, L2 |
| 3 | Counter-offer flow (REJECTED → PROPOSED) | `b3035ee` | C8 |
| 4 | Audit hardening (session check, stage matrix, property guard, html escape) | `c0b6754` | H1, H2, H4, H8 |
| 5 | Subscription polish: admin renewal button + preserve in-period nextRenewalAt | `b657939` | (A1+A2) |
| 6 | Subscription completion: B1 investor requests + B2 selective billing + C1 cron | `5febf56` | (B1+B2+C1) |
| 7 | Audit polish batch (8 items) | `b4964a4` | M2, M3, M4, M6, M9, L4, L5, L7 |
| 8 | Schema-blocked items: atomic invoice counter + PoF audit trail + drop unused field | `476f7cb` | C6, L1, M1 |

**Audit close-out: 26 of 29 items.** Remaining 3:
- M5 (cosmetic: PDF cache header to `no-store`) — 2 min if you ever want it
- M8 (notification spam) — **verified safe in the audit, no action needed**
- L3 (`prisma.config.ts` + `scripts/check-data.ts` untracked) — your files, your call

## Current platform state

### End-to-end live flows

Public site → save Contentful deal → 5-step register (CAPTCHA + AML + Premium upgrade hooks) → email verify → sign in (TOTP optional) → `/portal` dashboard → admin posts a deal via batch-post → investor responds (gated by PoF) → ACCEPT unlocks `/portal/deals/[id]` (10-stage pipeline with transition matrix + override) → offer with PoF gate (PATCH-side too) → vendor decides (REJECT keeps deal alive for counter-offer) → COMPLETED auto-creates Property → admin issues SOURCING / SUCCESS invoices (atomic RB-YYYY-NNNN numbering) → invoice PDF with bank details → admin marks PAID with reference. Cancellation/reactivation never silently demotes tier. Audit log + notifications + email for every privileged action.

### New surfaces shipped this session

- `/admin/subscriptions` — MRR stat + active subscribers table + cancelled list + RenewalGeneratorButton (Preview/Send with checkbox selection per subscriber) + last 20 invoices
- `/admin/investors/[id]/invoices` — per-investor invoice list + mark-paid/void actions
- `/portal/invoices` — investor list with outstanding/overdue banner + PDF download
- `/portal/subscription` — tier card + Monthly/Annual pricing + **SubscriptionRequestForm** (UPGRADE / CHANGE_MONTHLY / CHANGE_ANNUAL / CANCEL) routes through Messages tab + admin notification + email
- New admin API: invoices CRUD, subscriptions CRUD + `generate-renewals` with `dryRun=true` + `userIds=` filter + Bearer-token cron auth path, admin property DELETE
- New investor API: invoices list/PDF, subscription request, proof-of-funds upload (soft-delete via `supersededAt`)

### Automation live

**Weekly subscription renewal cron** — `.github/workflows/weekly-renewals.yml` runs Mondays 09:00 UTC + manual dispatch with horizon + dry-run inputs. Triggers `POST /api/admin/subscriptions/generate-renewals` with `Authorization: Bearer ${CRON_SECRET}`. Verified end-to-end this session ([run 26072175042](https://github.com/maxwellcudjoe/realestateapp/actions/runs/26072175042) — HTTP 200, empty result because no Premium subscribers yet).

## Pending external setup

Three env-var sets the user previously had keys for but never confirmed setting on Azure SWA. All three have graceful fallbacks (no crash if unset).

| Provider | Env vars | Notes |
|---|---|---|
| Turnstile (CAPTCHA) | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | Not provisioned at Cloudflare. Optional. |
| SumSub (KYC) | `KYC_PROVIDER=SUMSUB` + `SUMSUB_APP_TOKEN` + `SUMSUB_SECRET_KEY` (+ optional `SUMSUB_WEBHOOK_SECRET`) | Sandbox keys at `C:\Users\DELL\OneDrive\Desktop\Sumub.txt`. Webhook URL: `{NEXTAUTH_URL}/api/webhooks/sumsub` |
| getaddress.io (postcode) | `GETADDRESS_API_KEY` | Key at `C:\Users\DELL\OneDrive\Desktop\getaddressye.txt` |
| **Rêve Bâtir bank/pricing** | `REVE_BATIR_BANK_NAME` / `_SORT_CODE` / `_ACCOUNT` / `_ACCOUNT_NAME` / `_VAT_NUMBER` (optional) + `REVE_BATIR_SUCCESS_FEE_PCT` (default 1.5) + `REVE_BATIR_PREMIUM_MONTHLY` (default 49) + `REVE_BATIR_PREMIUM_ANNUAL` (default 499) | **Bank details are the ones that show on invoice PDFs.** Without them, PDFs show placeholders (`Lloyds Bank · 00-00-00 · 00000000`). |
| ✅ **`CRON_SECRET`** | already set both in Azure SWA + GitHub repo secrets | Done this session. |

## Deferred — Phase 6.8 Passkeys / WebAuthn

Not yet shipped. **Only outstanding gap-analysis item from before the audit cycle.** WebAuthn ceremonies need care (challenge state, attestation verification, counter replay, NextAuth integration). ~1–2 days focused work.

Scope: `@simplewebauthn/server` + `@simplewebauthn/browser`, `PasskeyCredential` model, 4 ceremony endpoints, `PasskeyManager` UI on `/portal/security`, "Sign in with passkey" on `/login`, NextAuth bridge.

## Mandatory workflow

This repo uses obsidian-logging (see `CLAUDE.md`). Before any task:

1. Read `obsidian/index.md` (catalogue)
2. Read last 10 lines of `obsidian/log.md` (recent work)
3. Classify the task → correct vault folder
4. End every response with: `📁 Save this note to: obsidian/[FOLDER]/[NOTE_TITLE].md`

## Quick-start

```
npm run dev                # :3000
npx vitest run             # 374 tests
npm run build              # prod build + typecheck + lint
npx prisma db push         # schema → Azure SQL
git push origin master     # deploys
```

## Infrastructure & credentials notes

- **Azure SQL server**: `gmxserver` in resource group `gbhlogistics`. Firewall rule for current dev IP added this session (name `claude-session-may19`, IP `154.161.38.129`). If IP rotates and `prisma db push` 5-says-blocked, run `az sql server firewall-rule create --resource-group gbhlogistics --server gmxserver --name claude-<date> --start-ip-address <ip> --end-ip-address <ip>`.
- **Azure SWA**: `dream-build-property` in resource group `dream-build`. App settings managed via `az staticwebapp appsettings set --name dream-build-property --resource-group dream-build --setting-names KEY=value`.
- **GitHub repo**: `maxwellcudjoe/realestateapp`. Secrets managed via `gh secret set NAME --repo maxwellcudjoe/realestateapp`. Existing: `AUTH_*`, `AZURE_*`, `CRON_SECRET`, `DATABASE_URL`, `NEXTAUTH_*`, `RENEWALS_ENDPOINT`.

## Recommended next moves

1. **Set the remaining env vars** (~15 min) — SumSub + getaddress.io + bank details. The keys are sitting on Desktop. Without bank details, invoice PDFs are embarrassing placeholders.
2. **Smoke-test the new admin flows on live** (~20 min) — `/admin/subscriptions` (RenewalGeneratorButton preview), `/admin/investors/[id]/invoices` (issue + mark paid), trigger a manual renewal dry-run from Actions tab.
3. **6.8 Passkeys** — ~1–2 days. Only outstanding pre-audit gap. Investor-side polish.
4. **Marketing pass** — hero copy, public deal photos, blog. Less plumbing, more storytelling.
5. **M5 cache header** — 2 min. PDF cache `private, max-age=60` → `no-store`. Cosmetic.

## Key planning + reference docs

- [[2026-05-18-deal-workflow-audit]] — 29 findings driving PRs #1–#8
- [[2026-05-19-subscription-workflow]] — full subscription workflow doc + the plan that drove PRs #5+#6
- [[2026-05-17-close-all-gaps-plan]] — original 6-phase roadmap that drove Phases 1–6
- [[2026-05-17-buyer-journey-gap-analysis]] — gap analysis that drove the close-all-gaps plan
- [[2026-05-17-handoff-prompt]] — previous session's handoff (predates the audit + Phase 7B)

## Read those + the recent log entries before starting new work

Ship clean: tests pass (`npx vitest run`), build clean (`npm run build`), vault updated, push to master. Never commit secrets. Prefer batched commits (Azure SWA cancels in-flight deploys when a newer commit lands on master — the final commit in a burst is what deploys).
