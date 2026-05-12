---
title: RealEstateWebSite Codebase Understanding
date: 2026-05-11
tags: [knowledge, architecture, nextjs, contentful, resend]
source: docs/codebase-understanding-2026-05-11.md
---

# RealEstateWebSite Codebase Understanding

## What this project is

A luxury-styled UK property sourcing website built with Next.js App Router.

Business goals implemented in code:
- Present brand and trust positioning across content/legal pages.
- Publish property deals from Contentful.
- Capture investor registrations and contact enquiries.
- Send transactional emails through Resend.

## Stack and runtime model

Core stack:
- Next.js 14 App Router
- React 18 + TypeScript (strict)
- Tailwind CSS design tokens
- Contentful SDK
- Resend SDK
- Zod validation
- Vitest tests

Runtime model:
- Server Components for most page rendering.
- Client Components for forms, nav interactions, modals, and gallery controls.
- ISR on home/deals pages (`revalidate = 60`).
- API Route Handlers under `src/app/api`.

## Folder map

- `src/app` route tree, metadata routes, API handlers.
- `src/components` split by domain (`home`, `deals`, `layout`, `ui`).
- `src/lib` integration adapters (`contentful`, `resend`).
- `src/types` shared domain models.
- `tests/api` route-handler behavior tests.
- `docs/superpowers` original design spec and build plan.

## Route behavior

Main pages:
- `/` home section composition + featured deal fetch.
- `/deals` contentful-backed list + strategy query filtering.
- `/register` client form posting to `/api/register`.
- `/contact` client form posting to `/api/contact`.
- `/about`, `/privacy`, `/terms`, custom `not-found`.

System pages:
- `robots.ts` blocks `/api/` and publishes sitemap URL.
- `sitemap.ts` defines canonical URLs and update frequencies.

## Data flow

### Contentful

- `src/lib/contentful.ts` lazily creates cached client from env.
- Missing env returns safe empty/null values.
- `normalizeDeal` maps CMS entries into internal `Deal` model.
- Homepage uses `getFeaturedDeal`, deals page uses `getDeals`.

### Email

- `src/lib/resend.ts` lazily creates cached client from `RESEND_API_KEY`.
- `sendEmail` centralizes sender identity and email send call.
- `POST /api/contact` validates input, sends owner email + auto-reply.
- `POST /api/register` validates input, sends owner email.

## UI patterns

- Dark and gold tokenized design system in Tailwind.
- Global typography from Cormorant Garamond + Montserrat via layout.
- Shared primitives: `Button`, `SectionLabel`, `GoldDivider`, `Logo`.
- Interactive behavior:
  - Navbar scroll transition state.
  - URL-based deals filter.
  - Deal modal + photo gallery with keyboard support.
  - Form status handling (idle/loading/success/error).

## Test coverage

- Vitest in node environment with path alias support.
- Coverage exists for both API routes:
  - success responses
  - validation failures
  - email provider failure path
  - contact route sends two emails

## Environment assumptions

Required env vars:
- `CONTENTFUL_SPACE_ID`
- `CONTENTFUL_ACCESS_TOKEN`
- `RESEND_API_KEY`
- `RESEND_TO_EMAIL`

Operational assumptions:
- Next image domain allowlist includes `images.ctfassets.net`.
- ISR cache interval is 60 seconds for home/deals.

## Noted risks/gaps

- `RESEND_TO_EMAIL` uses non-null assertion; missing value can fail at runtime.
- Email HTML interpolation has no explicit sanitization.
- Legal pages still contain placeholder values.
- Some social/contact links are placeholders.
- No mobile navbar menu implemented.
- Tests currently focus on API handlers only.

## Extension points

- Add deal fields: update `src/types/deal.ts`, normalize function, and UI components.
- Add form fields: update Zod schema, form state, API handler template, and tests.
- Add new routes: create page and include in sitemap.
- Expand quality: add component/integration tests beyond API-only scope.

## Mental model

Three loops describe the system:
- Content loop: Contentful -> lib adapter -> server-rendered deal views.
- Lead loop: form UI -> API + Zod -> Resend delivery.
- Brand loop: static pages + visual system + metadata routes.

## Source

Full technical write-up: `docs/codebase-understanding-2026-05-11.md`.
