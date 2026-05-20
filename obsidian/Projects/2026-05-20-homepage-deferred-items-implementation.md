---
title: "Homepage deferred items — implementation (PRs 1-5)"
date: "2026-05-20"
language: "typescript"
status: "complete"
tags: [homepage, insights, landing-pages, testimonials, screenshots, og-image, seo, sitemap]
---

# Homepage deferred items — implementation

Implementation of [[2026-05-19-homepage-deferred-items-plan]]. All five PRs landed in a single session. **520 → 558 tests (+38). Build clean. Zero schema delta.**

## What shipped

### PR 1 · Insights / blog teaser

| File | Type | Purpose |
|---|---|---|
| [src/lib/insights.ts](src/lib/insights.ts) | New | Contentful client + `getInsights` / `getInsight` / `getRelatedInsights` / `formatPublishedDate` |
| [src/components/home/InsightsTeaser.tsx](src/components/home/InsightsTeaser.tsx) | New | Server component, hides if zero featured insights, pads from recent |
| [src/app/insights/page.tsx](src/app/insights/page.tsx) | New | `/insights` index with category filter (URL `?category=`), empty-state copy |
| [src/app/insights/[slug]/page.tsx](src/app/insights/[slug]/page.tsx) | New | Article page with `generateStaticParams`, dynamic OG metadata, `Article` JSON-LD, related-insights block. Rich Text rendered via `@contentful/rich-text-react-renderer` (server-side React, no `dangerouslySetInnerHTML` on the body) |
| [src/app/sitemap.ts](src/app/sitemap.ts) | Updated → async | Includes `/insights` + each article slug |
| [src/components/layout/Navbar.tsx](src/components/layout/Navbar.tsx) | Updated | Added `/insights` link between Tour and Contact |
| [src/app/page.tsx](src/app/page.tsx) | Updated | `InsightsTeaser` inserted between `Faq` and `CtaBanner` |
| [tests/lib/insights.test.ts](tests/lib/insights.test.ts) | New (16 cases) | Contentful client mocked at module scope via `vi.mock`. Env-missing test uses `vi.resetModules` + dynamic re-import to bypass module-level client cache |

**Dependencies added**: `@contentful/rich-text-react-renderer ^16.2.1`, `@contentful/rich-text-types ^17.2.7`.

### PR 2 · City landing pages

| File | Purpose |
|---|---|
| [src/lib/landing-pages.ts](src/lib/landing-pages.ts) | Catalog: 3 strategies (BTL/HMO/FLIP) × 8 cities = 24 combos. Type-narrowing helpers `isValidStrategySlug` + `isValidCitySlug`. `cityShort` strips postcode suffix from `TARGET_AREAS` labels so heroes read cleanly |
| [src/lib/area-stats.ts](src/lib/area-stats.ts) | Live `prisma.deal.count` / `prisma.property.findMany` / `prisma.investorStrategy.count` filtered by `strategyCode` + `address contains cityShort` + relation `structuredAreas.some.code = citySlug`. `meaningfulCount` returns `null` below 3 data points (no thin-data stats) |
| [src/lib/area-landing-content.ts](src/lib/area-landing-content.ts) | Optional Contentful `areaLanding` fetch + `buildFallbackContent` so every URL renders even before content team fills the CMS |
| [src/app/[strategy]/[city]/page.tsx](src/app/[strategy]/[city]/page.tsx) | Dynamic route. `generateStaticParams` returns all 24 combos. `notFound()` on out-of-catalog params (safe — sibling literal directories like `/portal/foo` already match literally before the dynamic segment). `BreadcrumbList` + `Place` JSON-LD emitted in `<script>` tags. Embeds existing `PricingBlock` |
| [src/components/layout/Footer.tsx](src/components/layout/Footer.tsx) | Added "Deals by region" anchor block (6 hand-picked links) — distributes PageRank without diluting the primary nav |
| [src/app/sitemap.ts](src/app/sitemap.ts) | All 24 landing URLs at `priority 0.7` |
| [tests/lib/landing-pages.test.ts](tests/lib/landing-pages.test.ts) | 6 cases — count, shape, valid+invalid lookups, slug-narrow type guards |
| [tests/lib/area-stats.test.ts](tests/lib/area-stats.test.ts) | 7 cases. Uses `vi.hoisted` for mock function refs (vi.mock factory hoists above plain `const` declarations — `vi.hoisted` is the documented escape hatch) |

Build output confirms `/[strategy]/[city]` generates 24 SSG entries (visible in `Generating static pages (24/98)` step jump).

### PR 3 · `/tour` screenshots prep

| File | Purpose |
|---|---|
| [src/app/tour/page.tsx](src/app/tour/page.tsx) | `TourStop` gains optional `imageSrc` + `imageAlt`. Component branches: if both set, render `<Image fill priority={i<2}>`; else the existing gold-gradient placeholder. So today everything looks identical — when screenshots arrive, just populate the two fields per stop |
| [scripts/seed-tour-demo.ts](scripts/seed-tour-demo.ts) | Idempotent demo-investor seed (`demo@revebatir.co.uk` / `TourDemo!2026`). Base user only for now — stage-specific entities (Deal × 3 stages, Property, Invoices, Viewings) are documented in the script comment to extend before capture day |
| `package.json` | Added `seed:tour` npm script |
| [public/tour/README.md](public/tour/README.md) | Capture process: viewport 1440×900, `cwebp -q 82`, ≤120 kB target, EXIF strip via `exiftool -all=`. Two-reviewer privacy sign-off requirement before merge |

### PR 4 · Testimonials with consent-gating

| File | Purpose |
|---|---|
| [src/lib/testimonials.ts](src/lib/testimonials.ts) | Contentful client. **Critical safety filter**: `normalizeTestimonial` drops any entry where `consentRecorded !== true`, even if Contentful publishes it. Belt-and-braces — accidentally publishing a draft without consent cannot leak. Also drops entries missing quote / name / role. `getInitialsFromName` for avatar fallback |
| [src/components/home/Testimonials.tsx](src/components/home/Testimonials.tsx) | Rewritten as `async` server component. Renders nothing on empty (same graceful pattern as `PlatformProof`). Emits `ItemList` of `Review` JSON-LD per quote — eligible for star-rating rich results once 4+ are published. Photo via `next/image` or initials avatar fallback |
| [src/app/page.tsx](src/app/page.tsx) | `Testimonials` re-inserted between `PlatformProof` and `Faq` |
| [tests/lib/testimonials.test.ts](tests/lib/testimonials.test.ts) | 9 cases. The CRITICAL test verifies all three "no consent" cases (`true` keeps, `false` drops, missing field drops) — and uses `delete (entry.fields).consentRecorded` to simulate the missing-field path |

### PR 5 · OG metadata + placeholder images

| File | Purpose |
|---|---|
| [public/og/pricing.png](public/og/pricing.png), `tour.png`, `insights.png` | 90 kB each — placeholder copies of the site-default OG until design delivers branded 1200×630 versions |
| [public/og/README.md](public/og/README.md) | Brand spec for design team + cache-busting note (`?v=2` or rename) |
| [src/app/pricing/page.tsx](src/app/pricing/page.tsx) · [src/app/tour/page.tsx](src/app/tour/page.tsx) · [src/app/insights/page.tsx](src/app/insights/page.tsx) | `openGraph` + `twitter` blocks wired with the 1200×630 images. Article OG metadata in `[slug]/page.tsx` falls back to the article's `heroImage` (Contentful asset) when present |

## Verification

**Tests**: 520 → 558 (+38). All passing. Run: `npx vitest run`.

| Test file | Count | Notes |
|---|---|---|
| `tests/lib/insights.test.ts` | 16 | Mocked Contentful, env-missing path via `resetModules` |
| `tests/lib/testimonials.test.ts` | 9 | Includes the CRITICAL consent-gate test |
| `tests/lib/landing-pages.test.ts` | 6 | Pure logic, no IO |
| `tests/lib/area-stats.test.ts` | 7 | Mocked Prisma via `vi.hoisted` for safe mock-ref hoisting |

**Build**: `npm run build` exits 0. 98 static pages generated, including all 24 `/[strategy]/[city]` SSG entries. ISR `revalidate=600` on insights pages, `revalidate=3600` on landing pages.

## Bug-fix notes (encountered + resolved)

1. **vi.mock hoist before const init** — `area-stats.test.ts` originally declared mock fn refs as plain `const` above `vi.mock`. Vitest hoists `vi.mock` to the very top, so the const was `undefined` at mock-init. Fix: use `vi.hoisted(() => ({ mockA: vi.fn(), … }))` — documented escape hatch.
2. **Contentful TS strict typing** — `client.getEntries({ ..., order: '-fields.publishedAt' })` failed type-check because the strict `EntriesQueries` type wants `order` as an array. Existing `contentful.ts` worked around this by casting through `Record<string, unknown>`. Mirrored that pattern in all three new lib files.
3. **`prefer-const` lint** — `let featured = await ...` in `InsightsTeaser` was reassigned via `.push()` (mutation, not reassignment) so the let was unnecessary. Changed to `const`.
4. **Relation name `structuredAreas` not `targetAreaRows`** — verified against the schema before writing area-stats.

## Files changed (summary)

**New** (15):
- `src/lib/insights.ts`, `src/lib/testimonials.ts`, `src/lib/landing-pages.ts`, `src/lib/area-stats.ts`, `src/lib/area-landing-content.ts`
- `src/components/home/InsightsTeaser.tsx`
- `src/app/insights/page.tsx`, `src/app/insights/[slug]/page.tsx`, `src/app/[strategy]/[city]/page.tsx`
- `scripts/seed-tour-demo.ts`
- `public/og/{pricing,tour,insights}.png`, `public/og/README.md`, `public/tour/README.md`
- `tests/lib/{insights,testimonials,landing-pages,area-stats}.test.ts`

**Modified** (8):
- `src/app/page.tsx` (added InsightsTeaser + Testimonials)
- `src/app/sitemap.ts` (async, +insights, +landing pages)
- `src/app/tour/page.tsx` (image-ready + OG metadata)
- `src/app/pricing/page.tsx` (OG metadata)
- `src/components/home/Testimonials.tsx` (data-driven + consent-gated)
- `src/components/layout/Navbar.tsx` (Insights link)
- `src/components/layout/Footer.tsx` (Deals-by-region block + Insights link)
- `package.json` (deps + `seed:tour` script)

**Schema delta**: **none**.

## What still needs external action

| Item | Owner | What |
|---|---|---|
| 3 evergreen articles | Content team | Create `insight` content type in Contentful + publish at least 3 articles |
| Per-city intros | Content team | Create `areaLanding` content type + publish entries for 8 cities × 3 strategies (or any subset — fallback copy renders today) |
| 8 portal screenshots | Engineering + IR review | Run `npm run seed:tour`, capture 8 WebP, drop in `/public/tour/`, set `imageSrc`+`imageAlt` on the matching `TourStop` |
| ≥3 investor consents | Investor Relations | Collect signed consent for at least 3 quotes; publish in Contentful with `consentRecorded=true` |
| 3 branded OG PNGs | Design team | Replace `/public/og/{pricing,tour,insights}.png` (1200×630, ≤200 kB, brand spec in `public/og/README.md`) |

Each row is independent — neither the build nor the homepage break if any one is missing. Sections gracefully hide; landing pages render with fallback intros.

## 🤖 AI Prompts Used

User said "proceed with plan" after reviewing [[2026-05-19-homepage-deferred-items-plan]]. Implementation followed the plan's sequencing recommendation (PR 1 → 5 → 4 → 3 → 2), batched verification at the end (vitest + build). Three small bug-fixes required during build (prefer-const, Contentful TS, vi.mock hoist) — all root-cause-fixed rather than worked around.

📁 Save this note to: obsidian/Projects/2026-05-20-homepage-deferred-items-implementation.md
