---
title: "Homepage assessment — what it should be now"
date: "2026-05-19"
language: "general"
status: "in-progress"
tags: [homepage, marketing, conversion, ux, copywriting, gap-analysis]
---

# Homepage assessment — what it should be now

The homepage was written when the product was effectively *"we'll email you deals"*. It's now an end-to-end investor platform with KYC, AML, a 10-stage deal pipeline, Premium subscription, invoicing, viewings, a portfolio tracker, audit trail, and 2FA. The marketing surface hasn't caught up. This is the gap analysis + a complete re-IA.

## 1 · Snapshot — what the homepage says today

`src/app/page.tsx` composes 7 sections in this order:

| Section | What it claims | File |
|---|---|---|
| Hero | "We Find The Deal. You Build The Wealth." · CTAs: View Current Deals / Work With Us | [Hero.tsx](src/components/home/Hero.tsx) |
| What We Do | 3 services with emoji icons: Deal Sourcing 🏠 · Buy To Let 📈 · Acquisition Support 🔑 | [WhatWeDo.tsx](src/components/home/WhatWeDo.tsx) |
| Why Rêve Bâtir | Quote + 4 trust signals + 4 trust badges (HMRC · ICO · Due Diligence · UK-Wide) | [WhyReveBatir.tsx](src/components/home/WhyReveBatir.tsx) |
| How It Works | **4 steps ending at "Review & Respond"** | [HowItWorks.tsx](src/components/home/HowItWorks.tsx) |
| Featured Deal | One Contentful deal with BMV % + yield · CTA "Request Full Pack" → `/contact` | [FeaturedDeal.tsx](src/components/home/FeaturedDeal.tsx) |
| Testimonials | 3 testimonials with initials-only names ("James H.", "Sarah K.", "Marcus T.") | [Testimonials.tsx](src/components/home/Testimonials.tsx) |
| CTA Banner | "Ready to invest?" → `/register` | [CtaBanner.tsx](src/components/home/CtaBanner.tsx) |

Nav (`Navbar.tsx`): Home / About / Deals / Contact · Sign In · Register as Investor.

Footer: full compliance disclaimer with HMRC AML + ICO 00014027391 + Company number 17201842.

## 2 · Snapshot — what the platform actually does now

Everything below is built and shipped today. None of it is mentioned on the homepage.

### Investor side
- **5-step onboarding wizard** with AML/compliance capture (DOB, nationality, tax residency, NI, PEP status, source of funds), buyer-entity selection (Individual / Ltd / LLP / Trust), structured target areas (54 UK regions), multi-select strategy (BTL/HMO/FLIP/COMMERCIAL/SERVICED_ACCOM), experience + funding profile, mortgage details
- **Email verification** + **TOTP 2FA** + **10 single-use recovery codes**
- **Login activity log** + **IP rate limit + lockout**
- **Profile self-edit** (everything except AML-core, which is admin-edit)
- **Password change** + **GDPR data export** + **account self-delete**
- **Welcome landing** after verification

### Deal lifecycle (the big one)
- **10-stage transaction pipeline**: PROPOSED → OFFER_PENDING → OFFER_ACCEPTED → MEMO_OF_SALE → CONVEYANCING → SURVEY → MORTGAGE → EXCHANGED → COMPLETED (+ FALLEN_THROUGH terminal)
- **DealResponse** (ACCEPT / MORE_INFO / PASS)
- **Structured Offer** (amount, deposit %, cash/mortgage/mixed, target exchange date, conditions)
- **Counter-offer flow** — vendor REJECTED → investor submits a revised offer
- **Viewing requests** with confirm/decline/reschedule
- **Per-deal messaging thread**
- **Document room** (per-deal docs with investor/admin visibility scopes)
- **Deal team handoff** card (lead admin, solicitor, broker contacts)
- **Stage transition matrix** + **admin override** with required reason
- **Auto-advance** (offer submission moves PROPOSED → OFFER_PENDING)

### Premium tier (entirely absent from homepage)
- £20/month or £200/year (configurable via env vars, with safe defaults)
- **48-hour head start** on new deals (FREE sees them after 48h)
- Self-serve **upgrade / plan-change / cancel** requests via the portal
- Admin manual renewal billing
- **Weekly cron** generates renewal invoices every Monday 09:00 UTC

### Invoicing
- 3 invoice types: **SOURCING** (per-deal flat fee), **SUCCESS** (% of accepted offer, auto-suggested), **SUBSCRIPTION** (recurring)
- `RB-YYYY-NNNN` atomic numbering
- Branded **PDF generation** with bank details for off-platform transfer
- DRAFT → SENT → PAID workflow with **bank reference capture**
- Investor /portal/invoices with outstanding / lifetime-paid stats

### Portfolio (Phase 5, also absent from homepage)
- Auto-created `Property` on COMPLETED stage
- Per-property document archive (EPC, title deed, gas safety, EICR, tenancy agreement)
- Tenancy status, monthly rent, current value estimate
- Total purchase + total est. value + tenanted ratio in admin

### Compliance / security / audit
- **HMRC MLR registration** ✓ real
- **ICO** registration ✓ real (00014027391)
- **Companies House** ✓ real (17201842)
- **AML data capture** matching MLR 2017 requirements
- **PEP flagging** with Enhanced Due Diligence prompts
- **KYC re-review cycle** (18-month MLR retention)
- **Proof of funds** gate before viewings/offers (6-month freshness)
- **Document review** with admin approve/reject + per-doc notes
- **Audit log** of every privileged action (28 distinct action codes)
- **Soft-delete + 30-day anonymisation** cron (UK GDPR Art. 17)
- **HIBP breach check** on password
- **Turnstile CAPTCHA** + IP rate limiting

### Admin / ops
- 5-stage admin lifecycle: SUBMITTED → UNDER_REVIEW → DOCUMENTS_REQUESTED → DOCUMENTS_RECEIVED → KYC_APPROVED → ACTIVE_INVESTOR → DEAL_SENT
- **Sliding-window read-only impersonation** for support (HMAC-signed cookie, 4-hour cap)
- Admin can resend-verify, disable-2FA, force-reset, soft-delete, restore
- Per-investor activity feed unifying logins + audit + messages + viewings + favourites

## 3 · Where homepage diverges from platform

| What the homepage promises | What the platform actually delivers |
|---|---|
| "We email you deal packs" | A full investor portal with deal-by-deal pipeline tracking |
| 4-step "How It Works" ending at "Review & Respond" | 10-stage pipeline through to **completion + portfolio entry** |
| Implied "Contact us → we send a pack" workflow | Self-serve registration with KYC built in |
| No mention of subscription | Premium tier exists with 48h head start |
| No mention of pricing | 3 fee types (sourcing / success / subscription) all live |
| Vague trust signals | Real audit trail, real AML data, real KYC re-review cycle |
| 3 anonymous testimonials | Actual platform metrics could substitute (deals sourced, investors active, total BMV brokered) |
| "Request Full Pack → /contact" CTA on Featured Deal | Real investors hit `/deals` and have full self-serve once registered |
| No portfolio mention | Phase 5 Property tracking with document archive |
| No security/2FA mention | TOTP, recovery codes, login activity, account-takeover protections |

**Bottom line**: the homepage is selling a *2025 newsletter service*. The platform is a *2026 investor SaaS*. New visitors materially under-estimate what they're getting, which:
- depresses conversion to Premium (they don't know it exists)
- depresses registrations (they think they'll just get emails — same as competitors)
- under-prices the offer to investors evaluating multiple sourcing services
- under-sells compliance — the strongest differentiator vs. unregulated sourcers

## 4 · What the homepage should be now — full IA

Recommended section order. Numbers are roughly the % of vertical real estate each should occupy on a tall scroll.

### 4.1 · Hero (10%)
**Goal**: communicate the product category in one sentence; offer two clear paths.

Suggested copy:
> **Headline**: "The UK Property Deal Platform Built For Investors."
> **Sub**: "Find verified below-market-value deals. Track every step from offer to completion. All in one fully-compliant investor portal."
> **CTAs**: `Browse Current Deals →` (anonymous, no signup) · `Register Free →` (with subtle "Premium tier from £20/mo" under it)
> **Visual**: replace the abstract gold glow with a screenshot of the actual portal showing a deal card in pipeline

Why: current copy ("We Find The Deal. You Build The Wealth.") is poetic but generic. It could describe any sourcer. The new line names the *category* (platform, portal) which sets the right expectation before scroll.

### 4.2 · Live platform metrics strip (3%)
**Goal**: instant credibility via real numbers.

Suggested elements (all queryable from the DB):
- `N deals sourced YTD`
- `Avg M% below market`
- `£N in completed transactions`
- `N active investors`
- HMRC MLR Registered chip · ICO Registered chip · Companies House chip (each linking to the public register)

Why: testimonials with initials look manufactured. Real metrics are bullet-proof. These can refresh nightly from a server component.

### 4.3 · What the platform does (15%)
**Goal**: replace the 3 emoji-icon service cards with a 6-card grid that matches the actual product surface.

The cards should be:

1. **Verified Deal Sourcing** — every deal independently valued, BMV-verified, packaged with a full DD pack
2. **Investor Portal** — track every deal you've responded to, see the live stage, message your deal team
3. **48h Premium Head Start** — Premium subscribers see new deals 48 hours before everyone else
4. **End-to-End Pipeline** — from offer through conveyancing to completion, every step is on one dashboard
5. **Compliance Built In** — HMRC MLR-registered, full KYC/AML, ICO-registered data controller, GDPR-compliant by default
6. **Portfolio Tracker** — once a deal completes, the property auto-enters your portfolio with document archive

Visual: replace emoji with abstract gold-line icons or screenshot cut-outs.

### 4.4 · "How It Works" — but the *whole* journey (12%)
**Goal**: replace the 4-step diagram with an 8-step horizontal stepper that shows the platform's real value, NOT just registration.

Suggested steps:
1. **Register** — 5-step KYC + AML compliance wizard
2. **Set your criteria** — budget, strategy (BTL/HMO/FLIP/Commercial/Serviced), target areas, timeline
3. **Get matched deals** — alerted by email when a property matches; Premium gets a 48-hour head start
4. **Respond** — Accept · Request More Info · Pass · or *favourite* for later
5. **Viewing** — request a viewing through the portal, confirmed by our team
6. **Make your offer** — structured offer with deposit %, financing source, target exchange
7. **Pipeline tracking** — watch your deal progress through OFFER → MEMO_OF_SALE → CONVEYANCING → SURVEY → MORTGAGE → EXCHANGED → COMPLETED
8. **Portfolio** — your completed property enters your portfolio with the full document archive

Visual: a thin gold horizontal timeline with 8 dots. Each clickable to expand.

This single section reframes the value: it's not just "deal alerts", it's "the whole transaction concierge in one app".

### 4.5 · Pricing — Free vs Premium (10%)
**Goal**: surface the subscription. Currently zero mention. This is the single biggest revenue lever the platform has.

Two-column comparison:

| | **Free** | **Premium** |
|---|---|---|
| Matched deal alerts | ✓ | ✓ |
| Full deal pack download | ✓ | ✓ |
| Submit offers via portal | ✓ | ✓ |
| Pipeline tracking | ✓ | ✓ |
| Portfolio tracker | ✓ | ✓ |
| **48-hour head start** on new deals | — | **✓** |
| **Priority response** from deal team | — | **✓** |
| **Discounted success fee** (e.g. 0.5% vs 1%) | — | **✓** |
| | Free forever | **£20/mo or £200/yr** |
| | `Register Free →` | `Start Premium →` |

Why £200/yr (16.7% saving) framing if that matches the env defaults: this is a classic SaaS pricing pattern that captures buyers who want to "commit but save".

Pull the exact figures from `REVE_BATIR_PREMIUM_MONTHLY` / `REVE_BATIR_PREMIUM_ANNUAL` at build time so this stays in sync with what the app actually charges.

### 4.6 · Featured Deal (current section — keep but rework, 10%)
**Goal**: keep the visual hook, but make the CTA accurate.

Changes:
- Current CTA `Request Full Pack → /contact` should become `View Full Pack →` if registered, `Register to View →` otherwise. We have session info, we can branch server-side.
- Add **"Premium sees this 48h early"** badge when applicable
- Add **"+N more deals available to registered investors"** counter line at the bottom (live count from DB)

### 4.7 · Trust strip — but stronger (5%)
**Goal**: replace the 4 generic trust badges with verifiable claims.

Each badge should link to its public register / source:
- **HMRC MLR-Registered** — supervising authority on AML, money laundering, terrorist financing. Click → HMRC public register
- **ICO Registered Data Controller** — ICO certificate number 00014027391, click → ICO register
- **Companies House** — 17201842, click → Companies House public profile
- **All money via solicitor client accounts** — we never hold investor money. This is unique and worth saying explicitly.
- **2FA + audit-logged platform** — every privileged action is recorded
- **GDPR Article 17 compliant** — full self-serve data export + account deletion

Why surface "we never hold money"? It's the #1 trust differentiator vs. unregulated sourcers who take upfront fees with no recourse.

### 4.8 · FAQ (10%)
**Goal**: address the 8-10 questions every prospect actually asks.

Suggested questions:
1. Are you regulated? — Yes, HMRC MLR-registered. Property sourcing isn't FCA-regulated, but money handling is, and we don't handle your money.
2. What does it cost? — Free to register. Optional Premium £20/mo for 48h head start + discounted success fee. Per-deal sourcing fee + success fee on completion (transparent in your portal).
3. How long does the KYC take? — Typically 1-3 business days for first review. We re-verify every 18 months per MLR 2017.
4. What's a BMV deal? — Properties priced ≥10% below independent market comparables. Every BMV claim has comparables attached in the pack.
5. What if I view a property and don't buy? — No fee. Sourcing fee is invoiced when you commit to proceed (offer accepted), success fee on completion.
6. Can I buy through a Ltd company / SPV? — Yes. Onboarding captures your entity (Individual / Ltd / LLP / Trust) and Companies House number.
7. Are you the agent or the introducer? — We're the introducer. The vendor's agent / solicitor handles the actual sale. We track every step in your portal.
8. What happens after completion? — The property enters your portfolio in the portal. Upload tenancy docs, EPC, gas safety, EICR. We don't manage tenancies but we keep your records together.
9. Can I export my data? — Yes. `/portal/security` has a "Download my data" button. We're GDPR Article 17 compliant.
10. How do I cancel Premium? — `/portal/subscription` has a one-click cancel. Access continues until the end of your paid period.

Each FAQ should be a `<details>` element for SEO. Schema.org `FAQPage` JSON-LD for SERP rich results.

### 4.9 · Insights / blog teaser (5%)
**Goal**: SEO. Most sourcer competitors rank for "BMV property [city]" and Rêve Bâtir doesn't.

Even 3 evergreen articles would help:
- "What does 'below market value' actually mean? A buyer's guide"
- "BTL vs HMO vs SA — which strategy suits your portfolio?"
- "Stamp duty for SPVs in 2026 — what investors need to know"

A "Latest Insights" 3-card carousel pulling from Contentful (or a markdown folder) would meet the bar without huge engineering effort.

### 4.10 · Social proof — replace fake testimonials (5%)
**Goal**: keep the section but make it credible.

Options:
- Use **real first names** with **real LinkedIn-ish photos** of consenting investors (with permission, ideally with their portfolio metrics)
- Or replace with a **video testimonial** (one polished investor on camera)
- Or replace with a **stats panel**: "Last 12 months — 47 deals sourced · £8.2m brokered · 12.3% avg BMV · 89% completion rate"
- Star-rating widget linking to a Trustpilot / Google Reviews profile (the link is currently absent)

Today's testimonials read AI-generated and depress trust. Almost any of the above is better.

### 4.11 · Closing CTA (5%)
**Goal**: replace the current bland banner with a *decision*-prompting close.

Suggested copy:
> **Headline**: "Three minutes to register. A lifetime of compounding."
> **Subhead**: "Free forever. No credit card required. Upgrade to Premium any time."
> Two CTAs side-by-side: **`Register Free →`** (primary) · **`Start Premium · £20/mo →`** (secondary, gold)

The current CTA is generic — these explicitly offer a low-commitment and a higher-commitment option side by side.

## 5 · Beyond the homepage — supporting changes

### Navbar
- Add **Pricing** link (currently absent)
- Add **Insights / Blog** link if content section is added
- Optional: "Premium" CTA differentiated from "Register Free"

### Footer
- Add **registered office address** (legal requirement on many UK marketing pages)
- Add **complaints process** link (or contact email)
- Add **"Make a data subject request" or `/privacy#dsr` anchor**
- Add **Trustpilot** widget once enough reviews exist
- Currently fine on disclaimer language

### About page
Currently exists but I didn't review it. It should mirror the new positioning:
- Founder bio + photo (humanises the brand vs. faceless sourcers)
- "Our compliance posture" section
- "Our deal-flow process" — concrete: how do we find BMV deals, how are they verified
- "Our investor profile" — what kinds of investors thrive on the platform

### Contact page
Should mention:
- Quickest response: live chat / WhatsApp / phone (if available)
- Slower: form
- Explicit: "We don't take money on this form — all payments via Rêve Bâtir invoices and bank transfer"

### `/pricing` (new page worth considering)
Even if pricing block lands on homepage, a dedicated `/pricing` page captures the SEO query "rêve bâtir pricing" and gives a place to add detailed FAQ / comparison / case studies.

### `/portal` for unauthenticated visitors
A **portal preview** page showing screenshots of the actual investor dashboard would let prospects "see inside" before committing. Currently `/portal` requires auth — adding `/portal/preview` or `/tour` as an unauthenticated visual walkthrough would close a major preview gap.

## 6 · SEO + technical considerations

Current state:
- `layout.tsx` has comprehensive Schema.org `RealEstateAgent` JSON-LD ✓
- Metadata is set ✓
- Open Graph tags set ✓
- Robots crawl-friendly ✓

Gaps:
- **No `<h1>` content variation per area** — landing-page-per-city (e.g. `/btl/manchester`) would expand keyword footprint dramatically
- **No FAQ schema** — adding `FAQPage` JSON-LD on the FAQ section unlocks rich-result eligibility
- **No `Product` / `Service` schema** for the Premium subscription — adding it could surface pricing in SERPs
- **Featured deal lacks `Offer` schema** — currently a regular div; the deal could emit `Offer` / `Place` schema for property rich results
- **Sitemap is minimal** — adding deal pages (or area pages) would boost crawl
- **No `robots.txt` directives** for `/portal`, `/admin` — these should be `Disallow:` (and currently might leak via sitemap)

## 7 · Implementation sequencing (suggested)

| Sprint | Effort | What | Why now |
|---|---|---|---|
| 1 | ~2 h | Update Hero copy + add platform metrics strip (live from DB) | Highest-leverage credibility win |
| 2 | ~3 h | Replace 3-service grid with 6-card platform-feature grid; expand How-It-Works to 8 steps | Re-positions the product |
| 3 | ~3 h | Add Pricing block (Free vs Premium) — pull amounts from env at build time | Surfaces Premium for the first time |
| 4 | ~2 h | Rework FeaturedDeal CTA based on auth state + add Premium chip | Conversion path improvement |
| 5 | ~3 h | Replace Testimonials with real metrics panel OR opt-in real-investor testimonials | Removes fake-looking content |
| 6 | ~4 h | Add FAQ section (10 Q&A) + FAQ schema JSON-LD | SEO + objection-handling |
| 7 | ~half day | Build `/pricing` standalone page + Navbar link | Direct conversion entry point |
| 8 | ~half day | Build `/tour` (or `/portal/preview`) showing portal screenshots to unauthenticated visitors | Closes "what do I get?" gap |
| 9 | Backlog | Insights / blog teaser + 3 evergreen articles | Long-term SEO play |
| 10 | Backlog | Area-specific landing pages (`/btl/manchester`, `/hmo/leeds`) | Long-term SEO + ad targeting |

Sprints 1-5 are roughly a single dev-day if batched. They alone re-position the product.

## 8 · Two thinking traps to avoid

1. **"The current homepage works well"** — judged purely on aesthetics, sure. But the surface is *much* smaller than the product. New visitors leave thinking we're a newsletter; they'll never sign up for Premium they don't know exists.
2. **"We can fix the homepage later"** — the homepage is the funnel top. Every extra week of underselling Premium is direct lost ARR. The pricing block alone (Sprint 3) is the highest-ROI 3-hour change on the entire platform.

## 9 · One-liner summary

> The homepage describes a 2025 newsletter; the platform is a 2026 investor SaaS with KYC, AML, deal pipeline, viewings, offers, conveyancing tracking, invoicing, subscription, audit trail, and portfolio management. The fix is to **re-position from "we email you deals" to "the UK property deal platform built for investors"** with explicit pricing, an honest 8-step lifecycle diagram, real metrics, and an FAQ that closes the trust gap. Sprints 1-5 (≈1 dev-day) capture most of the win.

📁 Save this note to: obsidian/Knowledge/2026-05-19-homepage-assessment.md
