# Dream Build Property Group — Website Design Spec

**Date:** 2026-04-30
**Project:** `RealEstateWebSite`
**Repo:** https://github.com/maxwellcudjoe/realestateapp.git

---

## 1. Overview

A premium luxury property investment website for **Dream Build Property Group**, a UK-based real estate company specialising in deal sourcing, buy-to-let investment, and property acquisition.

**Tone:** Confident, trustworthy, aspirational — luxury real estate meets private members club.
**Palette:** Black and deep charcoal backgrounds, champagne gold accents, ivory text. No bright colours.
**Typography:** Cormorant Garamond (headings) + Montserrat (body/UI).

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server Components for Contentful fetches, ISR for deals |
| Language | TypeScript | Type safety across Contentful schema + API routes |
| Styling | Tailwind CSS + custom design tokens | Fast to build, tiny bundle, full luxury palette control |
| CMS | Contentful | Managed free tier, clean content model editor |
| Email | Resend | Modern API, free tier, reliable deliverability |
| Hosting | Vercel | Native Next.js support, auto-deploy from GitHub |
| Testing | Vitest | Unit tests for API route handlers |

---

## 3. Design System

### Colour Tokens (Tailwind config)

| Token | Hex | Usage |
|---|---|---|
| `obsidian` | `#0a0a0a` | Page backgrounds |
| `charcoal` | `#111111` | Card backgrounds |
| `carbon` | `#1e1e1e` | Borders, dividers |
| `gold` | `#c9a84c` | Accents, CTAs, labels |
| `gold-light` | `#e8c96b` | Hover states |
| `ivory` | `#f0e8d8` | Primary text |
| `stone` | `#888888` | Body copy, secondary text |

### Typography

| Role | Font | Weight | Size | Notes |
|---|---|---|---|---|
| H1 / Hero | Cormorant Garamond | 300 | 56–72px | Ivory, line-height 1.05 |
| H2 / Section | Cormorant Garamond | 400 | 38px | Ivory |
| H3 / Card title | Cormorant Garamond | 400 | 20–24px | Ivory |
| Eyebrow label | Montserrat | 500 | 10–11px | Gold, all-caps, letter-spacing 0.28em |
| Body | Montserrat | 300 | 14px | Stone, line-height 1.75 |
| Button | Montserrat | 600 | 11px | All-caps, letter-spacing 0.18em |
| Fine print | Montserrat | 300 | 8–9px | Stone/carbon |

### Logo

**Direction B — Rule + Horizontal Stack:**
- Vertical 1px gold rule on the left
- "Dream Build" in Cormorant Garamond 400, letter-spaced, ivory
- "Property Group" in Montserrat 500, tracked, gold
- Implemented as an inline SVG component

### Buttons

- Sharp edges (no border-radius)
- Default state: transparent background, 1px `gold` border, gold text
- Hover state: `gold` background fill, `obsidian` text
- Secondary variant: transparent, `carbon` border, `stone` text

### Navigation

- Sticky; transparent until 80px scroll threshold, then solid `obsidian` with 1px `carbon` bottom border
- Gold underline on active/hover nav links
- "Register as Buyer" CTA button top-right — links to `/register`

---

## 4. Project Structure

```
src/
  app/
    layout.tsx                  ← Root layout: Navbar + Footer
    page.tsx                    ← Home
    about/page.tsx
    deals/page.tsx
    register/page.tsx
    contact/page.tsx
    not-found.tsx               ← Custom 404
    api/
      contact/route.ts          ← POST — general enquiry
      register/route.ts         ← POST — investor registration
  components/
    layout/
      Navbar.tsx
      Footer.tsx
    home/
      Hero.tsx
      WhatWeDo.tsx
      WhyDreamBuild.tsx
      HowItWorks.tsx
      FeaturedDeal.tsx
      Testimonials.tsx
      CtaBanner.tsx
    deals/
      DealCard.tsx
      DealGrid.tsx
      FilterBar.tsx          ← Client Component (useSearchParams for active state)
      RequestPackModal.tsx   ← Client Component (modal open/close state)
    ui/
      Button.tsx
      Logo.tsx
      GoldDivider.tsx
      SectionLabel.tsx
  lib/
    contentful.ts               ← Contentful client + typed fetch helpers
    resend.ts                   ← Email send helper
  types/
    deal.ts                     ← Deal type (mirrors Contentful schema)
```

---

## 5. Pages

### Page 1 — Home (`/`)

Eight sections in order:

1. **Hero** — Full-screen dark background. Logo centred. H1: "We Find The Deal. You Build The Wealth." Subheadline. Two CTAs: "View Current Deals" (→ `/deals`) / "Work With Us" (→ `/register`). Background: CSS-only `@keyframes` animation pulsing a radial gold gradient — no JS library, no canvas.
2. **What We Do** — Three service columns: Deal Sourcing · Buy To Let · Acquisition Support. Each with icon, heading, one-line description.
3. **Why Dream Build** — Bold quote left ("Most investors don't have time to find the deals. We do.") + four gold-bordered trust badges right (HMRC registered / Verified BMV deals / Full deal pack / UK-wide network).
4. **How It Works** — 4-step numbered grid: Register → Criteria → Receive Deals → Complete.
5. **Featured Deal** — Contentful-driven deal card (marked `featured: true`) alongside editorial copy. "View All Deals" link.
6. **Testimonials** — Three dark investor quote cards with gold star ratings. Static/hardcoded in `Testimonials.tsx` — no CMS.
7. **CTA Banner** — Dark gold-tinted gradient. "Ready to invest? Register your buyer criteria today." "Get Started" button.
8. **Footer** — Logo, nav links (Home / About / Deals / Register / Contact), LinkedIn + Instagram social icons, full compliance text.

### Page 2 — About (`/about`)

- Hero: "Built on integrity. Driven by results."
- Founder section: professional headshot placeholder + bio copy
- Mission statement (gold left-border callout): "To make serious property investment accessible, transparent, and profitable."
- Three values: Integrity · Expertise · Results

### Page 3 — Deals (`/deals`)

- Top banner: "Register to receive deals directly to your inbox" with Register CTA
- Filter bar: All / BTL / HMO / Flip — URL-based (`?strategy=BTL`), no client JS
- Deal card grid: image, location, BMV badge, purchase price, gross yield, strategy, "Request Pack" button
- "Request Pack" opens a modal with name/email pre-filled with deal title, POSTs to `/api/contact`
- Contentful-driven, ISR revalidation every 60 seconds

### Page 4 — Register (`/register`)

Form fields:
- Full name
- Email address
- Phone number
- Investment budget (text, e.g. "£150,000–£300,000")
- Preferred strategy (select: BTL / HMO / Flip / All)
- Buyer type (select: Cash / Mortgage)
- Preferred areas (text)

On submit: POST to `/api/register` → Resend email to owner inbox → inline success message.

### Page 5 — Contact (`/contact`)

- Left column: email, phone, LinkedIn link, 24-hour response note
- Right column: name / email / message form → POST to `/api/contact`
- Auto-reply sent to enquirer on submission

### Custom 404 (`not-found.tsx`)

- Same luxury dark aesthetic
- "Page Not Found" in Cormorant Garamond
- "Return Home" gold button

---

## 6. Contentful Content Model — `deal`

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | Short text | ✓ | e.g. "3-Bed Terrace, Manchester" |
| `location` | Short text | ✓ | City + postcode area |
| `strategy` | Enum | ✓ | BTL / HMO / Flip |
| `marketValue` | Number | ✓ | £ |
| `purchasePrice` | Number | ✓ | £ — shown in gold |
| `grossYield` | Number | ✓ | % |
| `bmvPercent` | Number | ✓ | % — shown as badge |
| `sourcingFee` | Number | ✓ | £ |
| `image` | Media | ✓ | Property photo |
| `featured` | Boolean | | `true` → shown on homepage |
| `slug` | Short text | ✓ | URL-safe identifier |

---

## 7. API Routes

### `POST /api/register`

**Request body:**
```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "budget": "string",
  "strategy": "BTL | HMO | Flip | All",
  "buyerType": "Cash | Mortgage",
  "areas": "string"
}
```

**Behaviour:**
1. Validate with Zod (all fields required except `phone`)
2. Send formatted HTML email to `RESEND_TO_EMAIL` via Resend
3. Return `{ success: true }` — no database, no redirect

**Error:** Zod failure → 400 + field errors. Resend failure → 500 + `{ error: "Failed to send — please try again." }`

### `POST /api/contact`

**Request body:** `{ name, email, message, dealTitle? }`

**Behaviour:**
1. Validate with Zod
2. Send enquiry email to `RESEND_TO_EMAIL`
3. Send auto-reply to `email`
4. Return `{ success: true }`

---

## 8. Environment Variables

| Variable | Where set | Description |
|---|---|---|
| `CONTENTFUL_SPACE_ID` | Vercel env | Contentful space identifier |
| `CONTENTFUL_ACCESS_TOKEN` | Vercel env | Contentful delivery API token |
| `RESEND_API_KEY` | Vercel env | Resend API key |
| `RESEND_TO_EMAIL` | Vercel env | Owner inbox for form submissions |

---

## 9. Error Handling

| Scenario | Behaviour |
|---|---|
| Contentful fetch fails | Deals page shows "Deals coming soon — register to be notified" graceful state |
| Form Zod validation fails | Field-level gold error messages, form stays populated |
| Resend send fails | 500 returned; user sees "Failed to send — please try again", form stays populated |
| Unknown route | Custom `not-found.tsx` rendered |

---

## 10. Testing

- **Vitest** unit tests for `/api/register` and `/api/contact` route handlers
- Test cases: valid submission, missing required field (Zod), Resend failure (mock)
- No automated UI tests at launch — visual design verified manually

---

## 11. Deployment

1. GitHub repo: `https://github.com/maxwellcudjoe/realestateapp.git`
2. Vercel project linked to repo — auto-deploys on push to `master`
3. Set four environment variables in Vercel dashboard (see Section 8)
4. Custom domain (e.g. `dreambuildproperty.co.uk`) wired in Vercel once purchased
5. Add `.superpowers/` to `.gitignore`

---

## 12. Compliance Copy (Footer)

> "Dream Build Property Group Ltd is registered with HMRC under the Money Laundering Regulations. ICO registered. Company No. [XXXXXXXX]. All deals are sourced for the purposes of introduction only. Dream Build Property Group Ltd is not authorised or regulated by the Financial Conduct Authority. Property investment involves risk. Past performance is not indicative of future results."

*Replace `[XXXXXXXX]` with actual Companies House number before launch.*
