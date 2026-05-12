# RealEstateWebSite - Codebase Understanding

Date: 2026-05-11

## 1) What this project is

This repository is a luxury-styled UK property sourcing website built with Next.js App Router.

Primary business goals implemented in code:
- Present brand and trust positioning (home/about/legal pages).
- Show available property deals from Contentful.
- Capture investor registrations and contact enquiries.
- Send transactional emails through Resend.

## 2) Stack and runtime model

Core stack:
- Next.js 14 App Router
- React 18 + TypeScript (strict mode)
- Tailwind CSS with custom design tokens
- Contentful SDK for CMS deal data
- Resend SDK for email
- Zod for API input validation
- Vitest for API route tests

Runtime model:
- UI pages are mostly Server Components by default.
- Interactive widgets/forms/modals are Client Components.
- Deals and homepage featured deal use ISR (`revalidate = 60`).
- API endpoints live under `src/app/api/*` as Route Handlers.

## 3) High-level folder map

- `src/app`: Route tree, metadata routes, API handlers.
- `src/components`: UI broken into `home`, `deals`, `layout`, and shared `ui`.
- `src/lib`: External integrations (Contentful, Resend).
- `src/types`: Shared domain types (`Deal`).
- `tests/api`: Vitest coverage for both API handlers.
- `docs/superpowers`: Earlier design spec and implementation plan.

## 4) Route-by-route behavior

Main routes:
- `/` home: Composes Hero, service/value sections, featured deal, testimonials, CTA.
  - Fetches featured deal from Contentful with graceful fallback to null.
- `/deals`: Pulls deal list from Contentful and supports strategy filtering via query string.
  - Filter values: `All`, `BTL`, `HMO`, `Flip`.
  - Empty state shown if no deals or CMS unavailable.
- `/register`: Client form posts investor criteria to `/api/register`.
- `/contact`: Client form posts enquiry to `/api/contact`.
- `/about`, `/privacy`, `/terms`: Brand/legal content pages.
- `not-found`: Branded 404 page.

Metadata/system routes:
- `robots.ts`: Allows crawling, blocks `/api/`, publishes sitemap path.
- `sitemap.ts`: Declares canonical route URLs and frequencies.

## 5) Data and integration flows

### Contentful flow

File: `src/lib/contentful.ts`

- Lazily creates and caches a Contentful client from env vars:
  - `CONTENTFUL_SPACE_ID`
  - `CONTENTFUL_ACCESS_TOKEN`
- If env vars are missing, helpers return empty/null instead of throwing.
- Maps raw CMS entries to internal `Deal` shape via `normalizeDeal`.
- Handles image URL normalization (`https:` prefix) and gallery array cleanup.

Used by:
- `src/app/page.tsx` (`getFeaturedDeal`)
- `src/app/deals/page.tsx` (`getDeals`)

### Email flow

File: `src/lib/resend.ts`

- Lazily creates and caches Resend client from `RESEND_API_KEY`.
- Throws if API key is missing.
- `sendEmail` centralizes sender identity and call to Resend.

Used by API routes:
- `src/app/api/contact/route.ts`
  - Validates with Zod.
  - Sends owner notification email.
  - Sends confirmation auto-reply to user.
- `src/app/api/register/route.ts`
  - Validates with Zod.
  - Sends owner registration email only.

Destination inbox:
- `process.env.RESEND_TO_EMAIL` (non-null assertion in both handlers).

## 6) UI composition and patterns

Design system behavior:
- Tailwind color tokens are dark + gold (`obsidian`, `charcoal`, `gold`, etc.).
- Google fonts wired in root layout:
  - Cormorant Garamond for headings (`font-serif`)
  - Montserrat for body/UI (`font-sans`)
- Reusable primitives:
  - `Button`: link or button mode, primary/secondary variants, optional full width.
  - `SectionLabel`, `GoldDivider`, `Logo`.

Important client interactions:
- `Navbar` scroll state toggles transparent vs solid style after 80px.
- `FilterBar` uses URL query params for strategy state.
- `DealCard` opens:
  - `RequestPackModal` (posts to contact API with deal title)
  - `PhotoGallery` (keyboard nav + body scroll lock)
- `register` and `contact` pages:
  - Keep form state local.
  - Display field/server errors based on API response.
  - Show success states inline.

## 7) Testing and quality coverage

Test setup:
- `vitest.config.ts` uses `node` environment and `@` alias.

Current tests:
- `tests/api/contact.test.ts`
  - success path
  - validation failure
  - email send call count (2)
  - downstream failure to 500
- `tests/api/register.test.ts`
  - success path
  - invalid email
  - missing required fields
  - downstream failure to 500

Testing strategy observed:
- `@/lib/resend` is mocked.
- Route handlers are imported lazily after mocks.
- Tests focus on contract and behavior of handlers, not SDK internals.

## 8) Configuration and operational assumptions

Known required environment variables:
- `CONTENTFUL_SPACE_ID`
- `CONTENTFUL_ACCESS_TOKEN`
- `RESEND_API_KEY`
- `RESEND_TO_EMAIL`

Next.js config:
- Allows remote images from `images.ctfassets.net`.

ISR behavior:
- Home and deals pages revalidate every 60 seconds.

## 9) Notable strengths

- Clear separation between content fetch, email integration, and UI.
- Graceful CMS failure behavior (pages still render).
- Strong route-handler validation using Zod.
- Reasonable API test coverage for main success/failure paths.
- Consistent visual language applied across components.

## 10) Gaps and risks I noticed

- `RESEND_TO_EMAIL` is used with non-null assertion. Missing value could fail at runtime without explicit error messaging.
- Email templates interpolate user input directly into HTML strings. There is no explicit escaping/sanitization layer.
- Legal pages contain placeholder values (`[DATE]`, company/registration placeholders).
- Social and contact links include placeholder destinations in some places.
- Navigation has no mobile menu implementation (links/CTA are hidden on small screens in navbar).
- Test suite currently targets API handlers only; there are no component/render tests or integration tests.

## 11) Practical extension points

If adding features, these are the natural places:
- New CMS fields: update `src/types/deal.ts`, `normalizeDeal`, and rendering components.
- New form/API fields: update corresponding Zod schema + page form state + tests.
- New mail behavior: centralize in `src/lib/resend.ts`, then extend route handlers.
- New pages/SEO entries: add route in `src/app/*` and update `src/app/sitemap.ts`.
- Additional quality checks: add tests under `tests/*` and optionally UI test setup.

## 12) Fast mental model

You can think about the app in three loops:
- Content loop: Contentful -> `lib/contentful` -> server-rendered deals UI.
- Lead loop: form UI -> API route + Zod -> Resend email delivery.
- Brand loop: static pages + design tokens + metadata routes for SEO and trust.

This structure is clean and easy to extend without major rewrites.