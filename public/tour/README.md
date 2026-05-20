# `/tour` portal screenshots

The `/tour` page references one optimised WebP per stop. Until a file is dropped in this folder, the corresponding stop renders the gold-gradient placeholder block on the page — it never 404s.

## Required files (when ready)

| File | Tour stop | What the screenshot should show |
|---|---|---|
| `01-onboarding.webp` | 01 · Onboarding | `/onboarding` Step 3 — AML compliance step with PEP question + source-of-funds fields |
| `02-matched-deals.webp` | 02 · Matched Deals | `/portal/deals` — 3-card grid, Premium 48h chip, favourite hover |
| `03-response-viewing.webp` | 03 · Response + Viewing | `/portal/deals/[id]` in ACCEPTED state with viewing-request form expanded |
| `04-structured-offer.webp` | 04 · Structured Offer | `/portal/deals/[id]/offer` — OfferForm with all 5 fields populated |
| `05-pipeline-tracking.webp` | 05 · Pipeline Tracking | `/portal/deals/[id]` (CONVEYANCING) — stage indicator + timeline + deal team |
| `06-invoicing.webp` | 06 · Invoicing | `/portal/invoices` — outstanding + lifetime-paid stats + 3 SENT invoices |
| `07-portfolio.webp` | 07 · Portfolio | `/portal/portfolio` — Property card with tenanted chip + value + docs |
| `08-security-gdpr.webp` | 08 · Security + GDPR | `/portal/security` — 2FA chip + login activity + Download-my-data button |

## How to capture

1. `npm run seed:tour` — seeds the demo investor (`demo@revebatir.co.uk`) with a deal in every lifecycle stage and supporting documents
2. Run `npm run dev`, log in as the demo investor (password set in `scripts/seed-tour-demo.ts`)
3. Set browser viewport to 1440×900 (DPR 2 for retina — actual capture 2880×1800)
4. Capture the relevant page (Chrome DevTools → ⋮ → More tools → Capture screenshot — or `Win+Shift+S`)
5. Crop to a ~16:10 area around the relevant UI element
6. Convert + optimise: `npx @squoosh/cli --webp '{"quality":82}' --resize '{"width":1440,"method":"lanczos3"}' input.png`
7. Drop the resulting `.webp` into this folder with the matching filename above
8. Reference it in [src/app/tour/page.tsx](../../src/app/tour/page.tsx) by setting `imageSrc` + `imageAlt` on the matching `TourStop`

## Privacy review before merge

- No real investor names, emails, or addresses visible — only seed data
- Property addresses replaced with generic seed addresses
- Strip EXIF: `exiftool -all= 0X-name.webp`
- Two reviewers (engineering + IR) sign off before merge
