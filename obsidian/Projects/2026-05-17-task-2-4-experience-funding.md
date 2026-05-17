---
title: "Task 2.4 — Experience, Timeline, Mortgage, Referral"
date: "2026-05-17"
language: "TypeScript / Next.js / Prisma"
status: complete
tags: [onboarding, sales-data, phase-2, R12, R13, R14, R15]
---

# Task 2.4 — Experience / Timeline / Mortgage / Referral

Closes 4 gaps in one shot — info admin needs to prioritise & qualify investors.

## Schema (`InvestorProfile`)

```prisma
experienceLevel     String?   @db.NVarChar(20)   // FIRST_TIME | OWN_1_3 | OWN_4_10 | OWN_10_PLUS
timelineToBuy       String?   @db.NVarChar(20)   // IMMEDIATE | M_1_3 | M_3_6 | M_6_PLUS | EXPLORING
mortgageStatus      String?   @db.NVarChar(20)   // NONE | AIP | FULL_OFFER
mortgageLender      String?   @db.NVarChar(100)
maxLtv              Int?
depositAvailable    Decimal?  @db.Decimal(12, 2)
referralSource      String?   @db.NVarChar(100)
```

All nullable — backwards compat with pre-2.4 accounts.

## UI

Extends `StepCriteria` (no new wizard step — keeps the wizard at 5 steps):
- 2-column row: Buyer Type / Experience Level (required)
- 2-column row: Timeline to Buy (required) / Referral Source (free text, optional)
- **Conditional block** when `buyerType === 'mortgage'`: bordered panel with Mortgage Status (required), Lender, Max LTV %, Deposit Available £

## Admin panel

New "Experience & Funding" full-width panel on `/admin/investors/[id]` below
the Compliance panel. Mortgage fields only render for mortgage buyers.
Deposit available shown if provided.

## Validation rule

`buyerType === 'mortgage'` → `mortgageStatus` must be set. Cash buyers skip
all mortgage fields entirely.

## Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | +7 fields on InvestorProfile |
| `src/lib/compliance.ts` | +EXPERIENCE_LEVELS, TIMELINE_OPTIONS, MORTGAGE_STATUS_OPTIONS + label helpers |
| `src/lib/schemas/onboarding.ts` | +7 fields on stepCriteriaSchema + onboardingSubmitSchema; cross-field refine for mortgage status |
| `src/components/onboarding/StepCriteria.tsx` | +`CriteriaData` exported type; mortgage panel conditional; 4 new selects/inputs |
| `src/app/onboarding/page.tsx` | State shape uses imported CriteriaData |
| `src/app/api/onboarding/route.ts` | Persists all fields; nullifies mortgage fields for cash buyers |
| `src/app/admin/investors/[id]/page.tsx` | New Experience & Funding panel |
| Tests updated; +1 test (mortgage status required) |

## Verification

- Build: ✅
- Tests: ✅ 103/103 pass (was 102)

## Gaps closed
- R12 ✅ Experience level
- R13 ✅ Investment timeline
- R14 ✅ Mortgage detail (status, lender, LTV, deposit)
- R15 ✅ Referral source / marketing attribution
