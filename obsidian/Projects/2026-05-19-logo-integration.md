---
title: "Brand logo integration — wordmark + variants + animated entry"
date: "2026-05-19"
language: "typescript"
status: "complete"
tags: [branding, design, logo, animation, og-image, favicon]
---

# Brand logo integration

User provided their actual logo (`PHOTO-2026-05-08-21-59-38.jpg`): a hand-drawn calligraphic "Rêve Bâtir" wordmark with an architectural roof line flowing organically out of the final letter, plus a clean tracked-caps "REALTY LTD · BROKERAGE" sub-line. Editorial / luxury / French-inspired — fits the platform's "premium investor service" positioning.

Until now the site had a text-only fake-logo (gold vertical rule + serif text). This PR replaces it with the real wordmark across the site, generates favicon + OG image variants from the source, and adds calligraphy-themed entrance animations so the brand mark *arrives* on the page.

## What was done

### 1 · Asset generation

New `scripts/generate-logo-variants.js` uses **sharp** (added as a dev dep) to produce 11 derived assets from the single source JPG:

| Output | Purpose |
|---|---|
| `public/brand/logo-full.png` | Full wordmark, black ink, transparent BG — for light surfaces |
| `public/brand/logo-full-light.png` | Same in ivory ink — the default for our dark UI |
| `public/brand/logo-icon.png` / `-light.png` | Square crop containing the house motif + a letterform hint |
| `public/brand/logo-mark.png` / `-light.png` / `-gold.png` | Pure architectural roof sketch — three colour variants for tight UI |
| `public/brand/favicon-32.png` | 32x32 for `<link rel="icon">` |
| `public/brand/favicon-180.png` | 180x180 Apple touch icon |
| `src/app/icon.png` | Next.js app-router favicon (replaces the old `icon.tsx`) |
| `src/app/apple-icon.png` | Next.js app-router Apple touch icon |
| `src/app/opengraph-image.png` | 1200x630 OG image with logo centred on dark canvas + gold glow + tagline — replaces dynamic `opengraph-image.tsx` |
| `src/app/twitter-image.png` | Same as OG, separate file so Next picks it up |

The transparent-PNG conversion uses a perceptual-luminance threshold so anti-aliased edges of the hand-drawn calligraphy stay smooth. Background pixels above the threshold become fully transparent; darker pixels keep alpha proportional to their darkness with the chosen tint colour overlaid.

### 2 · Logo component refactor

`src/components/ui/Logo.tsx` rewritten — now uses `next/image` pointing at the generated PNGs with size + variant props:

```tsx
<Logo size="xl" variant="light" />   // 520w hero centerpiece
<Logo size="lg" />                   // 340w auth pages
<Logo size="md" />                   // 220w forms
<Logo size="sm" />                   // 140w navbar (default)
```

`variant: 'light' | 'dark'` picks the ivory vs black PNG. `href={null}` renders the image unwrapped (for centred layouts where the parent handles links).

### 3 · Calligraphy-themed entrance animation

New CSS utilities in `globals.css`:

- `animate-ink-settle` — opacity + horizontal drift + slight scale + blur transitioning to crisp. Mimics ink "settling" onto the page. 1.8s cubic-bezier easing. Applied to the Hero logo, then chained with `animationDelay` to stagger the tagline, gold underline, eyebrow, H1, body, CTAs, and footnote.
- `animate-gold-shimmer` — a slow horizontal gold-light sweep along a thin underline element. Subtle, never overwhelming.
- `reveal-init` / `reveal-shown` — IntersectionObserver-paired utilities for scroll-revealing other sections (foundation laid for later use).

### 4 · Hero rebuild

`Hero.tsx` now leads with the XL logo + a shimmering gold underline, then the staggered ink-settle entrance for every other element (3.5s total choreography). The H1 is demoted slightly in size since the wordmark itself now carries the brand identity.

### 5 · Section flourishes

New `src/components/ui/BrandDivider.tsx` — places the gold architectural roof sketch between two faint gold gradient lines as a section divider. Wired into `src/app/page.tsx` at two places: after `PlatformFeatures` and after `PricingBlock`. Replaces the generic gold line with a brand-specific motif.

### 6 · Auth funnel branding

Added the lg-size logo to the top of:
- `/login`
- `/onboarding`
- `/forgot-password`
- `/reset-password`
- `/verify-email-sent`

Each uses `animate-ink-settle` so the brand mark feels alive even on small utility pages.

### 7 · Favicon + social previews

- `src/app/icon.tsx` (the old "RB" text-rendered favicon) **deleted**
- `src/app/opengraph-image.tsx` (the old text-based OG generator) **deleted**
- `src/app/twitter-image.tsx` **deleted**
- Replaced by static PNG files generated from the actual logo

## Files changed

**New** (5):
- `scripts/generate-logo-variants.js`
- `src/components/ui/BrandDivider.tsx`
- `public/brand/*.png` (8 generated files + the source JPG)
- `src/app/icon.png` + `apple-icon.png` + `opengraph-image.png` + `twitter-image.png`

**Modified** (8):
- `src/components/ui/Logo.tsx` — full rewrite, image-backed
- `src/app/globals.css` — 4 new animation utilities
- `src/components/home/Hero.tsx` — XL logo centerpiece + staggered ink-settle
- `src/app/page.tsx` — BrandDivider integration
- `src/app/login/page.tsx` — Logo + ink-settle entry
- `src/app/onboarding/page.tsx` — Logo + ink-settle entry
- `src/app/forgot-password/page.tsx` — Logo + ink-settle entry
- `src/app/reset-password/page.tsx` — Logo + ink-settle entry
- `src/app/verify-email-sent/page.tsx` — Logo + ink-settle entry

**Deleted** (3): `src/app/icon.tsx`, `src/app/opengraph-image.tsx`, `src/app/twitter-image.tsx`

**Dependency added**: `sharp` (dev dep, used only by the build-time generation script — not pulled into runtime bundles)

## How to make it alive elsewhere (suggested follow-ups)

- **Loading states**: place `logo-mark-gold.png` at 40% opacity in empty/skeleton states across the portal
- **Email signatures**: embed `logo-full.png` (black variant on white email backgrounds) at the top of every transactional template
- **Invoice PDF header**: replace the current text "Rêve Bâtir" with `logo-full.png` for the rendered PDF — uses `@react-pdf/renderer` Image component
- **Per-deal OG images**: extend the script to template per-deal OG previews (deal title + BMV % + logo) and route them through Next's dynamic OG
- **Hover micro-animation**: navbar logo could shimmer the gold underline on hover (the `animate-gold-shimmer` utility is already in place)
- **Reduced-motion fallback**: `@media (prefers-reduced-motion: reduce)` rule to disable `animate-ink-settle` for users who opted out

## Tests

54 files / 520 tests passing. Build clean (no new bundle size issues — sharp only runs at script time, never imported by app code).

## 🤖 AI Prompts Used

User shared the JPG and asked "how can we use this and also make our website alive with the appearance of the logo".

📁 Save this note to: obsidian/Projects/2026-05-19-logo-integration.md
