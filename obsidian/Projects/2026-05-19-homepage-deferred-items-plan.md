---
title: "Homepage deferred items — full implementation plan (Sprints 9-10 + screenshots + testimonials + OG)"
date: "2026-05-19"
language: "typescript"
status: "planning"
tags: [homepage, marketing, seo, insights, landing-pages, testimonials, screenshots, og-image, plan]
---

# Homepage deferred items — full implementation plan

Companion to [[2026-05-19-write-mode-impersonation-and-homepage-rebuild]]. The Sprints 1-8 work shipped. This plan closes the five remaining marketing-surface items that were deferred either on content or on visual-asset dependencies:

| # | Item | Blocker at time of defer |
|---|---|---|
| 1 | **Sprint 9** — Insights / blog teaser | Content team must produce 3 evergreen articles |
| 2 | **Sprint 10** — City-specific landing pages (`/btl/manchester` etc.) | Content team must select priority cities + write per-page intros |
| 3 | **Real portal screenshots for `/tour`** | Engineering owes — capture 8 real screens |
| 4 | **Real investor testimonials** with consent | Investor-relations owes — collect consents + photos |
| 5 | **OG images** for `/pricing` and `/tour` | Design owes — 2× 1200×630 assets |

Each item below is sequenced as a self-contained PR so the work can land in any order. **No schema deltas required** — all data lives in Contentful (insights, testimonials, area copy) or `/public` (screenshots, OG). Verified by reading [src/lib/contentful.ts](src/lib/contentful.ts) — the client is already wired for arbitrary content types.

**Total scope**: 5 PRs · ~3-4 dev-days of engineering · plus dependencies on content/design/IR (parallelisable).

---

## PR 1 · Sprint 9 — Insights / blog teaser + index + article pages

**Goal**: ship the engineering for an editorial channel. Content team fills it.

### 1.1 · Contentful content type — `insight`

Add one new content type in Contentful (no app deploy needed for new content):

| Field ID | Type | Required | Notes |
|---|---|---|---|
| `title` | Short text (≤120) | ✓ | H1 + meta title fallback |
| `slug` | Short text, unique, regex `^[a-z0-9-]+$` | ✓ | URL segment |
| `summary` | Long text (≤300) | ✓ | Card teaser + meta description |
| `body` | Rich Text | ✓ | Main content |
| `heroImage` | Media (image) | ✓ | Card + article hero |
| `category` | Short text, enum: `Strategy`, `Compliance`, `Tax`, `Market`, `Process` | ✓ | Powers filter UI |
| `publishedAt` | Date & time | ✓ | Sort key + sitemap lastmod |
| `readingMinutes` | Integer (1-30) | ✓ | "5 min read" chip |
| `author` | Short text | ✓ | JSON-LD `Article.author.name` |
| `featured` | Boolean | — | Surfaces on homepage teaser (max 3) |

Three seed articles (titles from [[2026-05-19-homepage-assessment]]):

1. *What does "below market value" actually mean? A buyer's guide* (Category: Strategy)
2. *BTL vs HMO vs SA — which strategy suits your portfolio?* (Category: Strategy)
3. *Stamp duty for SPVs in 2026 — what investors need to know* (Category: Tax)

### 1.2 · Library — `src/lib/insights.ts`

```ts
import { createClient } from 'contentful'
import { documentToHtmlString } from '@contentful/rich-text-html-renderer'

export interface Insight {
  id: string
  title: string
  slug: string
  summary: string
  bodyHtml: string         // rendered from Rich Text at fetch time
  heroImageUrl: string | null
  category: 'Strategy' | 'Compliance' | 'Tax' | 'Market' | 'Process'
  publishedAt: string      // ISO
  readingMinutes: number
  author: string
  featured: boolean
}

export async function getInsights(opts?: { featured?: boolean; limit?: number }): Promise<Insight[]>
export async function getInsight(slug: string): Promise<Insight | null>
export async function getRelatedInsights(slug: string, category: string, limit = 3): Promise<Insight[]>
```

Mirror the patterns in [src/lib/contentful.ts](src/lib/contentful.ts) — module-level `cachedClient`, env-var fall-back to empty array, defensive `normalizeInsight()`.

New dev dep: `@contentful/rich-text-html-renderer` (~12 kB) — adds to `package.json`. Server-side render only — no client bundle hit.

### 1.3 · Routes

**`src/app/insights/page.tsx`** (server component)
- Hero: "Insights for UK Property Investors"
- Filter bar: All · Strategy · Compliance · Tax · Market · Process (URL `?category=Strategy`)
- Grid of all articles, newest first — 3 columns desktop, 1 mobile
- Each card: hero image, category chip, title, summary, reading time, date
- Empty state if Contentful unreachable: "Insights coming soon — check back in a few days"
- `revalidate = 600` (10 min ISR)
- Metadata: title, description, canonical `/insights`

**`src/app/insights/[slug]/page.tsx`** (server component)
- `generateStaticParams()` — pre-renders all article slugs at build
- `generateMetadata()` — pulls title/summary/heroImage/publishedAt into OG + Twitter cards
- Header: category chip, H1, byline (author · publishedAt · readingMinutes)
- Hero image (`next/image`, priority)
- Body: `dangerouslySetInnerHTML` (already sanitised by Contentful's Rich Text renderer; do NOT pass raw user input)
- `Article` JSON-LD with `headline`, `datePublished`, `author`, `image`, `publisher`
- "Related insights" — 3 cards from same category, fallback to most recent if <3
- Closing CTA: "Register Free →" + "Browse Current Deals →"
- `notFound()` if `getInsight(slug)` returns null
- `revalidate = 600`

### 1.4 · Homepage teaser — `src/components/home/InsightsTeaser.tsx`

Server component. Fetches `getInsights({ featured: true, limit: 3 })`. If <3 results, pads with most recent.

- Section label: "Insights" · H2: "Recent thinking from the platform"
- 3-card grid identical to `/insights` cards
- Footer link: "Browse all insights →" → `/insights`
- **Renders nothing** if `getInsights` returns empty (graceful — same pattern as `PlatformProof` from Sprint 5)

### 1.5 · Homepage composition

Update [src/app/page.tsx](src/app/page.tsx) to insert `InsightsTeaser` between `Faq` and `CtaBanner`:

```ts
<Faq />
<InsightsTeaser />
<CtaBanner />
```

### 1.6 · Navbar

Update [src/components/layout/Navbar.tsx](src/components/layout/Navbar.tsx) `NAV_LINKS`:

```ts
{ href: '/insights', label: 'Insights' },
```

Insert between `Tour` and `Contact`.

### 1.7 · Sitemap

Update [src/app/sitemap.ts](src/app/sitemap.ts) to make `default export` async and append:

```ts
const insights = await getInsights()
const insightEntries = insights.map((i) => ({
  url: `${BASE_URL}/insights/${i.slug}`,
  lastModified: new Date(i.publishedAt),
  changeFrequency: 'monthly' as const,
  priority: 0.5,
}))
return [...staticEntries, { url: `${BASE_URL}/insights`, ... }, ...insightEntries]
```

### 1.8 · Tests — `tests/lib/insights.test.ts`

7 cases (mocking Contentful client):
- `getInsights()` returns mapped + sorted-desc by publishedAt
- `getInsights({ featured: true })` filters correctly
- `getInsights({ limit: 3 })` slices correctly
- `getInsight(slug)` returns null when not found
- `getRelatedInsights` excludes self, prefers same category
- `normalizeInsight` handles missing heroImage gracefully
- All return `[]` when env vars missing (parity with `getDeals`)

### 1.9 · Acceptance criteria

- [ ] Contentful `insight` content type created with all fields
- [ ] 3 seed articles published with featured=true
- [ ] `/insights` renders 3 cards, filter bar works
- [ ] `/insights/[slug]` renders article with JSON-LD validating in Google Rich Results Test
- [ ] Homepage shows InsightsTeaser between FAQ and CTA
- [ ] Navbar shows "Insights" link
- [ ] Sitemap includes `/insights` + each article URL
- [ ] All tests pass (520 → 527)
- [ ] Build clean, no new TS errors

**Effort**: ~6 hours engineering · article writing is content-team time (parallel).

---

## PR 2 · Sprint 10 — City + strategy landing pages (`/btl/manchester` etc.)

**Goal**: capture long-tail SEO queries like "BTL deals manchester" via dedicated landing pages. Each page is unique (≥500 words, real local stats) to avoid thin-content penalty.

### 2.1 · Scope decision — which combos to ship

24 pages: **8 cities × 3 strategies** (BTL, HMO, FLIP). Avoid SA + Commercial initially — lower search volume and harder to write compelling copy per city.

| Strategy | Cities (codes from [src/lib/target-areas.ts](src/lib/target-areas.ts)) |
|---|---|
| BTL | `manchester`, `liverpool`, `leeds`, `birmingham`, `nottingham`, `sheffield`, `bristol`, `cardiff` |
| HMO | same 8 |
| FLIP | same 8 |

Catalog lives in code so build can statically generate all 24 paths. Content team can later expand.

### 2.2 · Catalog — `src/lib/landing-pages.ts`

```ts
import { TARGET_AREAS } from './target-areas'
import { STRATEGIES } from './strategies'

export interface LandingPage {
  strategySlug: 'btl' | 'hmo' | 'flip'
  strategyCode: 'BTL' | 'HMO' | 'FLIP'
  citySlug: string         // matches TARGET_AREAS.code
  cityLabel: string        // human label from TARGET_AREAS
  contentfulSlug: string   // `${strategySlug}-${citySlug}` — Contentful lookup key
}

export const LANDING_PAGE_CITIES = [
  'manchester', 'liverpool', 'leeds', 'birmingham',
  'nottingham', 'sheffield', 'bristol', 'cardiff',
] as const

export const LANDING_PAGE_STRATEGIES = ['btl', 'hmo', 'flip'] as const

export function getAllLandingPages(): LandingPage[]
export function getLandingPage(strategySlug: string, citySlug: string): LandingPage | null
```

### 2.3 · Area stats — `src/lib/area-stats.ts`

Pulls live DB stats per area code (uses existing `InvestorProfile.targetAreas` and `Property` models — verified by reading the schema).

```ts
export interface AreaStats {
  dealsLast12Months: number          // Deal.count where the application's targetAreas includes city
  completedLast12Months: number      // Property.count where address contains city (best-effort)
  avgBmvPercentage: number | null    // null if <3 data points (don't extrapolate)
  avgGrossYield: number | null
  activeInvestorsTargetingArea: number  // distinct InvestorProfile with this targetArea
}

export async function getAreaStats(citySlug: string): Promise<AreaStats>
```

Avoid claims when n<3 — return `null` so the renderer hides the stat instead of saying "0%". Same conservatism as `PlatformProof`.

### 2.4 · Content source — Contentful `area_landing` type

| Field | Type | Notes |
|---|---|---|
| `slug` | Short text | Format `${strategySlug}-${citySlug}`, e.g. `btl-manchester` |
| `introCopy` | Long text (≥500 chars) | Unique per page — local market context, demographic, transport, regen |
| `whyHereBullets` | Short text list (3-5) | "Strong rental demand from 2 universities", "Crossrail expansion 2027" |
| `localComparables` | Long text (optional) | Anonymised recent comp data |
| `heroImageUrl` | Media | City landmark or skyline |
| `publishedAt` | Date | Sitemap lastmod |

Fallback if content missing: render the page with a generic intro pulled from a template — never 404 a known combo.

### 2.5 · Route — `src/app/[strategy]/[city]/page.tsx`

This is a top-level catch-all that conflicts with no existing route (verified against the `src/app` directory listing — `/btl`, `/hmo`, `/flip` are not used yet). Add an explicit guard at the top:

```ts
const VALID_STRATEGIES = ['btl', 'hmo', 'flip']
const VALID_CITIES = LANDING_PAGE_CITIES

export async function generateStaticParams() {
  return getAllLandingPages().map((p) => ({
    strategy: p.strategySlug,
    city: p.citySlug,
  }))
}

export default async function Page({ params }: { params: { strategy: string; city: string } }) {
  if (!VALID_STRATEGIES.includes(params.strategy)) notFound()
  if (!VALID_CITIES.includes(params.city as any)) notFound()
  // ...render
}
```

Page composition (top-to-bottom):

1. **Breadcrumbs**: Home › Insights › `${Strategy} in ${City}` — emit `BreadcrumbList` JSON-LD
2. **Hero**: H1 `"${Strategy} deals in ${City}"` · subhead from Contentful · CTA "Browse current ${strategy} deals" → `/deals?strategy=${code}` (existing deals page already supports filter)
3. **Local stats strip**: 3 stats from `getAreaStats()` — only render those that aren't null
4. **Why ${city} for ${strategy}**: `whyHereBullets` rendered as 4-card grid
5. **Intro copy**: rich-text rendered from `introCopy`
6. **Embedded PricingBlock**: reuse existing component — explains how the platform works
7. **3 most recent matching deals**: pulls from Contentful where `strategy=${code}` (max 3 cards) — if none, hide section
8. **Embedded FAQ subset**: 4 FAQs filtered to relevance (pricing, sourcing fee, KYC time, BMV definition)
9. **Closing CTA**: "Set ${city} as a target area and get matched alerts" → `/register?prefill_area=${citySlug}&prefill_strategy=${code}`

JSON-LD: `LocalBusiness` + `Place` (for the city) + `BreadcrumbList` + `Article` (for the introCopy).

`revalidate = 3600` (1 hour ISR — area stats refresh).

### 2.6 · Sitemap

Append all 24 combos to [src/app/sitemap.ts](src/app/sitemap.ts):

```ts
const landingEntries = getAllLandingPages().map((p) => ({
  url: `${BASE_URL}/${p.strategySlug}/${p.citySlug}`,
  lastModified,
  changeFrequency: 'weekly' as const,
  priority: 0.7,
}))
```

### 2.7 · Internal linking

To boost SEO ranking, add a "Deals by region" block to the footer (`src/components/layout/Footer.tsx`) with 6 anchor links — top 2 cities × 3 strategies. Limits the link-graph footprint while still distributing PageRank.

### 2.8 · Navbar — explicitly NOT updated

These are SEO landing pages, not nav links. Adding them would dilute the primary nav. The footer block (2.7) is the discovery mechanism.

### 2.9 · Tests

**`tests/lib/landing-pages.test.ts`** (5 cases):
- `getAllLandingPages()` returns 24 entries
- `getLandingPage('btl', 'manchester')` returns valid object
- Invalid slug returns null
- `contentfulSlug` format is `${strategy}-${city}`
- Catalog only contains known city codes

**`tests/lib/area-stats.test.ts`** (4 cases, mocking Prisma):
- Returns shape with all 5 fields
- Avg BMV is null when fewer than 3 data points
- Avg yield is null when fewer than 3 data points
- Investor count uses distinct profiles

**`tests/app/landing-page.test.tsx`** (3 cases, RTL):
- Renders without Contentful content (fallback intro)
- 404s on invalid strategy
- 404s on invalid city

### 2.10 · Acceptance criteria

- [ ] `landing-pages.ts` + `area-stats.ts` created with full test coverage
- [ ] `/btl/manchester` and 23 other URLs render successfully
- [ ] Contentful `area_landing` content type created
- [ ] At least 4 cities seeded with content (Manchester, Liverpool, Birmingham, Leeds — top priority); others use fallback
- [ ] `BreadcrumbList` + `Place` JSON-LD validates
- [ ] Sitemap includes all 24 URLs
- [ ] Footer has "Deals by region" anchor block
- [ ] No conflict with existing routes (verified by `next build`)
- [ ] All tests pass (527 → 539)

**Effort**: ~10 hours engineering · content team writes 8-24 intros in parallel.

**Phasing option**: Phase 10A ships the infrastructure with fallback copy live for all 24 pages. Phase 10B is content fill-in by the content team — no engineering needed once 10A ships.

---

## PR 3 · Real portal screenshots for `/tour`

**Goal**: replace the 8 gold-gradient placeholder blocks in [src/app/tour/page.tsx](src/app/tour/page.tsx) with real portal captures.

### 3.1 · Pre-capture setup

Use seeded data, never real investor data. Existing scripts:
- `scripts/check-data.ts` (referenced in repo) — useful to understand seed structure
- New `scripts/seed-tour-demo.ts` — creates one demo investor "Demo Investor" with a deal in each lifecycle stage, so all 8 stops can be captured

Demo investor email: `demo@revebatir.co.uk` · password set via env or local-only.

### 3.2 · Capture list — exactly what each screenshot must show

| # | Tour stop | Page captured | Required elements |
|---|---|---|---|
| 01 | Onboarding | `/onboarding` (Step 3 of 5) | StepCompliance wizard with PEP question + source of funds fields visible |
| 02 | Matched Deals | `/portal/deals` | 3-card grid, Premium 48h chip visible, favourite icon on hover |
| 03 | Response + Viewing | `/portal/deals/[id]` after ACCEPT | DealCard in ACCEPTED state + viewing-request form expanded |
| 04 | Structured Offer | `/portal/deals/[id]/offer` | OfferForm with all 5 fields filled, deposit % slider, conditions textarea |
| 05 | Pipeline Tracking | `/portal/deals/[id]` (CONVEYANCING) | Stage indicator + timeline + deal team card |
| 06 | Invoicing | `/portal/invoices` | Outstanding stat + lifetime-paid stat + 3 SENT invoices in the table |
| 07 | Portfolio | `/portal/portfolio` (Phase 5) | Property card with tenanted chip + document count + value estimate |
| 08 | Security + GDPR | `/portal/security` | 2FA enabled chip + login activity table + "Download my data" button |

### 3.3 · Capture process

1. Run app locally with seeded demo investor logged in
2. Set viewport to 1440×900 (2× DPR for retina — actual capture 2880×1800)
3. Use Chrome DevTools "Capture screenshot" (full element or full page)
4. Optional: macOS `cmd+shift+5` or Windows `Win+Shift+S` for cleaner crops
5. Crop to ~16:10 frame around the relevant UI element
6. Run through `next/image`-friendly conversion: `cwebp -q 82 input.png -o 0X-name.webp`
7. Aim for ≤120 kB per image. If above, drop quality to 75.

### 3.4 · Asset layout

```
public/
  tour/
    01-onboarding.webp
    02-matched-deals.webp
    03-response-viewing.webp
    04-structured-offer.webp
    05-pipeline-tracking.webp
    06-invoicing.webp
    07-portfolio.webp
    08-security-gdpr.webp
```

### 3.5 · Code changes

Update [src/app/tour/page.tsx](src/app/tour/page.tsx):

1. Add to the `TourStop` interface:
   ```ts
   imageSrc: string
   imageAlt: string
   ```

2. Populate each entry in the `TOUR` array:
   ```ts
   {
     badge: '01 · Onboarding',
     // ... existing fields
     imageSrc: '/tour/01-onboarding.webp',
     imageAlt: 'Portal onboarding wizard showing the AML compliance step with PEP and source-of-funds questions',
   }
   ```

3. Replace the placeholder `<div>` (the gold-gradient block) with `<Image>`:
   ```tsx
   import Image from 'next/image'
   <Image
     src={stop.imageSrc}
     alt={stop.imageAlt}
     width={1440}
     height={900}
     priority={index < 2}
     className="rounded-md ring-1 ring-carbon"
   />
   ```

4. Add a subtle browser-chrome frame around each image (CSS-only — `before:` pseudo-element with 3 dots) for visual context.

### 3.6 · Privacy review

- No real names, emails, addresses, photos in any capture
- Property addresses scrubbed or replaced with generic seed addresses
- Any monetary figures should match the seed dataset, not real deals
- Run each WebP through `exiftool -all=` to strip EXIF metadata (which can include device + capture time)

### 3.7 · Tests

`tests/app/tour.test.tsx` (new file, 3 cases):
- Page renders all 8 stops with images
- Each image has non-empty alt text (a11y)
- `priority` flag set on stops 1 and 2 only (perf budget)

### 3.8 · Acceptance criteria

- [ ] 8 WebP screenshots in `/public/tour/` totaling <1 MB
- [ ] No PII visible in any image (manual review)
- [ ] EXIF stripped from every file
- [ ] `tour/page.tsx` updated with `imageSrc` + `imageAlt`
- [ ] Lighthouse a11y score for `/tour` stays ≥95
- [ ] Lighthouse perf score for `/tour` stays ≥90 (LCP <2.5s)
- [ ] Tests pass (539 → 542)

**Effort**: ~3 hours engineering · ~3 hours capture + optimisation.

---

## PR 4 · Real investor testimonials with consent

**Goal**: re-introduce the `Testimonials` section with real consenting investors. Removes the AI-fingerprint vibe from the 3 fake quotes ("James H.", "Sarah K.", "Marcus T.") currently sitting in [src/components/home/Testimonials.tsx](src/components/home/Testimonials.tsx).

### 4.1 · Consent process (IR-owned, prerequisite to engineering)

Investor Relations gathers consent from at least 4-6 investors. Each consent must capture:

- Investor's name (full first + last initial OR full name)
- Approved quote (verbatim — no editing without re-approval)
- Permitted attribution (e.g. "BTL Investor, Manchester" — area-only, never address)
- Optional headshot with explicit "may be used on website" permission
- Date of consent
- Right to withdraw process (must be documented — minimum: email IR, removed within 5 working days)

Consent records stored in the existing legal docs system (out of scope here). Record GDPR lawful basis: **consent (Art. 6(1)(a))**.

### 4.2 · Contentful content type — `testimonial`

| Field | Type | Required | Notes |
|---|---|---|---|
| `quote` | Long text (≤300) | ✓ | The approved verbatim quote |
| `name` | Short text | ✓ | Full first + last initial e.g. "James Henderson" or "James H." |
| `role` | Short text | ✓ | e.g. "BTL Investor · Manchester" |
| `photoUrl` | Media (image) | — | Optional headshot, square aspect |
| `consentDate` | Date | ✓ | Date IR recorded consent (not published date) |
| `consentRecorded` | Boolean | ✓ | Belt-and-braces — must be true to publish |
| `displayOrder` | Integer | ✓ | Manual ordering (lower = first) |
| `featured` | Boolean | — | Surfaces on homepage (max 3); others appear on a dedicated `/testimonials` page if needed |

Contentful **publish workflow**: enforce content-type validation that `consentRecorded === true` before publish allowed.

### 4.3 · Library — `src/lib/testimonials.ts`

```ts
export interface Testimonial {
  id: string
  quote: string
  name: string
  role: string
  photoUrl: string | null
  consentDate: string
  featured: boolean
}

export async function getTestimonials(opts?: { featured?: boolean; limit?: number }): Promise<Testimonial[]>
```

Empty array if Contentful unreachable (graceful — section hides itself).

**Safety filter at fetch time**: drop any entry where `consentRecorded !== true` even if Contentful publishes it. Belt-and-braces.

### 4.4 · Component update — `src/components/home/Testimonials.tsx`

Replace the hard-coded `TESTIMONIALS` array with a data source:

```tsx
export async function Testimonials() {
  const items = await getTestimonials({ featured: true, limit: 3 })
  if (items.length === 0) return null  // graceful, same as PlatformProof
  return (
    // ... existing JSX, but iterate over `items`
    // Conditionally render photoUrl with next/image; fall back to initials avatar if absent
  )
}
```

Add `Review` JSON-LD per testimonial inside the section (aggregated as `ItemList` of `Review` items) — eligible for star-rating rich results once 4+ are published.

### 4.5 · Homepage composition

Update [src/app/page.tsx](src/app/page.tsx) to insert `Testimonials` **between** `PlatformProof` and `Faq`:

```tsx
<PlatformProof />
<Testimonials />
<Faq />
```

Both `PlatformProof` (live stats) and `Testimonials` (real quotes) coexist — they're complementary trust signals. The "fake testimonial" risk is gone because `Testimonials` now hides itself if no real ones are published.

### 4.6 · Tests — `tests/lib/testimonials.test.ts`

5 cases:
- `getTestimonials()` returns mapped entries
- `getTestimonials({ featured: true })` filters correctly
- Returns `[]` if env vars missing
- **Filters out entries with `consentRecorded === false`** (critical safety case)
- `displayOrder` ascending sort respected

`tests/components/Testimonials.test.tsx` (3 cases):
- Renders nothing if zero items
- Renders 3 items with quotes, names, roles
- Renders initials avatar fallback when `photoUrl` absent

### 4.7 · Acceptance criteria

- [ ] At least 3 investors have signed consent records on file (IR-confirmed)
- [ ] Contentful `testimonial` content type created
- [ ] 3+ testimonials published with `consentRecorded=true`, `featured=true`
- [ ] `Testimonials` component re-introduced to homepage between `PlatformProof` and `Faq`
- [ ] Component hides itself when zero published items
- [ ] `Review` JSON-LD validates in Rich Results Test
- [ ] Withdrawal process documented — confirm 5-working-day SLA
- [ ] Tests pass (542 → 550)

**Effort**: ~3 hours engineering · IR consent collection is parallel (1-2 weeks typical).

---

## PR 5 · OG images for `/pricing` and `/tour`

**Goal**: when shared on Slack, LinkedIn, X, or WhatsApp, both marketing pages render a branded preview card instead of a generic stub.

### 5.1 · Design brief (for design team)

2 assets:
- `/public/og/pricing.png` (1200×630, ≤200 kB)
- `/public/og/tour.png` (1200×630, ≤200 kB)

Brand spec (matches existing site palette + type stack):
- Background: `#0e0e0e` (carbon) with subtle gold radial gradient
- Logotype: Rêve Bâtir wordmark top-left
- Headline (serif, ivory): `/pricing` → "Pricing · Free or Premium" · `/tour` → "Tour the Investor Portal"
- Subhead (sans-serif, stone): one-line value prop
- Bottom strip: HMRC + ICO + Companies House compliance row in small caps
- No screenshots (those age and need re-shooting)

### 5.2 · Code changes

Update [src/app/pricing/page.tsx](src/app/pricing/page.tsx) and [src/app/tour/page.tsx](src/app/tour/page.tsx) metadata:

```ts
export const metadata: Metadata = {
  // ... existing fields
  openGraph: {
    title: 'Pricing · Rêve Bâtir',
    description: '...',
    url: '/pricing',
    images: [{ url: '/og/pricing.png', width: 1200, height: 630, alt: 'Rêve Bâtir Pricing — Free or Premium' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og/pricing.png'],
  },
}
```

Repeat for `/tour` with `tour.png`.

### 5.3 · Verification

- After deploy, run each URL through [OpenGraph.xyz](https://www.opengraph.xyz/) — verify card renders correctly
- Paste each URL into Slack draft → preview should show branded card
- LinkedIn Post Inspector → confirm crawl picks up image

### 5.4 · Acceptance criteria

- [ ] 2 PNG files in `/public/og/`, both <200 kB
- [ ] Metadata wired in both pages
- [ ] Post Inspector shows correct preview for both
- [ ] No TS errors (Metadata type is strict)

**Effort**: ~1 hour engineering (after design delivers).

---

## Cross-cutting · Sitemap consolidation

After PRs 1, 2, and 5 land, [src/app/sitemap.ts](src/app/sitemap.ts) needs a refactor:

- It must be **async** to fetch insights + landing pages
- Split into helpers: `getStaticEntries()`, `getInsightEntries()`, `getLandingPageEntries()`
- Add `/insights`, `/insights/[slug]` (dynamic), `/btl/[city]`, `/hmo/[city]`, `/flip/[city]`
- New tests: `tests/app/sitemap.test.ts` verifies all entries present and well-formed

---

## Sequencing recommendation

| Order | PR | Why this order |
|---|---|---|
| 1 | **PR 3 — Screenshots** | Pure engineering, unblocks visual polish of an already-live page, no external dependency. Can ship today. |
| 2 | **PR 5 — OG images** | Design team can work in parallel from day 1; merging is trivial once assets arrive. |
| 3 | **PR 1 — Insights** | Engineering ships infrastructure; content team writes the 3 articles in parallel. Articles can publish post-merge. |
| 4 | **PR 4 — Testimonials** | Depends on IR consent timeline (often 1-2 weeks). Engineering small but **must** wait for at least 3 signed consents before publishing. |
| 5 | **PR 2 — Landing pages** | Largest engineering surface; content team has the most lead time. Ship infrastructure first (24 URLs live with fallback copy), let content fill in per city after merge. |

**Parallelisation**: PRs 1, 3, 5 can be developed concurrently. PRs 2 and 4 can start once infra-PRs merge to avoid sitemap conflicts.

---

## Files changed (summary across all 5 PRs)

**New** (~18 files):
- `src/lib/insights.ts`, `src/lib/landing-pages.ts`, `src/lib/area-stats.ts`, `src/lib/testimonials.ts`
- `src/app/insights/page.tsx`, `src/app/insights/[slug]/page.tsx`
- `src/app/[strategy]/[city]/page.tsx`
- `src/components/home/InsightsTeaser.tsx`
- `public/tour/01-onboarding.webp` × 8
- `public/og/pricing.png`, `public/og/tour.png`
- `scripts/seed-tour-demo.ts`
- `tests/lib/insights.test.ts`, `tests/lib/landing-pages.test.ts`, `tests/lib/area-stats.test.ts`, `tests/lib/testimonials.test.ts`
- `tests/app/landing-page.test.tsx`, `tests/app/tour.test.tsx`, `tests/app/sitemap.test.ts`
- `tests/components/Testimonials.test.tsx`

**Modified**:
- `src/app/page.tsx` — insert `InsightsTeaser` + re-insert `Testimonials`
- `src/app/tour/page.tsx` — add image fields, replace placeholders with `next/image`
- `src/app/pricing/page.tsx` — OG metadata
- `src/app/sitemap.ts` — async + insights + landing pages
- `src/components/home/Testimonials.tsx` — data-driven from Contentful
- `src/components/layout/Navbar.tsx` — add `/insights` link
- `src/components/layout/Footer.tsx` — add "Deals by region" anchor block
- `package.json` — add `@contentful/rich-text-html-renderer`

**Schema delta**: **none** — all content lives in Contentful or `/public`.

**Test target**: 520 → ~552 (+32). All passing.

---

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Contentful outage at build time breaks `/insights/[slug]` static gen | `generateStaticParams` falls back to empty array; `revalidate=600` retries; deploy-time check tolerates Contentful unavailable |
| Landing-page thin content triggers Google ranking penalty | Every page must have ≥500 unique words; render fallback intro until Contentful is filled; Phase 10A flag for "noindex if intro <300 chars" until content lands |
| Real screenshots leak PII | Use dedicated seed dataset; strip EXIF; visual review by 2 people before merge |
| Testimonial withdrawn after publish | Unpublish in Contentful → next ISR cycle (10 min) removes from site; document the 5-working-day SLA on the consent form |
| OG image cached by social networks before re-render | Bump filename hash on update (`pricing-v2.png`) to invalidate Facebook + LinkedIn caches |

---

## Two thinking traps to avoid (from the original [[2026-05-19-homepage-assessment]])

1. **"Let's wait for all content before shipping any PR"** — wrong. Each PR is self-isolating; infrastructure can land with fallbacks. Content fills in over weeks without engineering re-involvement.
2. **"24 landing pages is too many — start with 3"** — wrong. Three pages doesn't move SEO. The cost difference between 3 and 24 is content-team time only; engineering is paid once.

---

## 🤖 AI Prompts Used

User asked to "produce a plan for the above fully implemented" — referring to the five items deferred in [[2026-05-19-write-mode-impersonation-and-homepage-rebuild]] (Sprints 9-10, real screenshots, real testimonials, OG images). This document is the full implementation-ready plan: 5 PRs, ~3-4 dev-days, ~32 new tests, zero schema delta, sequenced for parallel content + engineering work.

📁 Save this note to: obsidian/Projects/2026-05-19-homepage-deferred-items-plan.md
