---
title: "Task 2.2 — Multi-Select Strategy + Fix Any/All Mismatch"
date: "2026-05-17"
language: "TypeScript / Next.js / Prisma"
status: complete
tags: [matching, phase-2, R11]
---

# Task 2.2 — Multi-Select Strategy

Closes gap **R11** (single-select strategy + Any/All enum mismatch). Investors
can now pick any combination of 5 canonical strategies. Completes the
matching-data layer started in Task 2.1.

## Schema

```prisma
model InvestorStrategy {
  id                String          @id @default(cuid())
  investorProfileId String
  investorProfile   InvestorProfile @relation(fields: [investorProfileId], references: [id], onDelete: Cascade)
  strategy          String          @db.NVarChar(30)
  createdAt         DateTime        @default(now())

  @@unique([investorProfileId, strategy])
  @@index([strategy])
}
```

`InvestorProfile.strategy` (String) preserved for backwards compat — populated
with the first selected strategy as a "primary" mirror.

## Canonical strategies

5 codes, stable forever:
- `BTL` — Buy To Let
- `HMO` — House in Multiple Occupation
- `FLIP` — Buy / refurbish / sell
- `COMMERCIAL` — Offices, retail, industrial
- `SERVICED_ACCOM` — Short-stay / Airbnb-style

The old "Any" / "All" pseudo-strategy is gone — selecting all 5 expresses the
same intent and is queryable.

## `legacyToStrategies()` helper

Maps legacy single-strategy strings to the new code list:
- `'BTL'` → `['BTL']`
- `'Any'` / `'All'` → all 5 codes
- `'SA'` → `['SERVICED_ACCOM']`
- unknown → `[]`

Used by the admin investor detail page to render old accounts as if they had
structured strategies.

## UI

`StepCriteria` replaces the single-select dropdown with a 5-row checkbox group.
Each row shows the strategy label + a short description ("Long-term rental to
a single household", etc.). At least one is required.

Review page shows the joined list. Admin page renders gold chips, falling back
to legacy mapping if no structured rows exist.

## Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | +InvestorStrategy model + relation |
| `src/lib/strategies.ts` | New — STRATEGIES catalog, helpers, legacy mapper |
| `src/lib/schemas/onboarding.ts` | `strategies: string[]` array on both step + submit; removed `VALID_STRATEGIES`; `Any` enum gone |
| `src/components/onboarding/StepCriteria.tsx` | Replaces dropdown with checkbox group |
| `src/components/onboarding/StepReview.tsx` | Shows joined list |
| `src/app/onboarding/page.tsx` | State shape: `strategies: string[]` (default `['BTL']`) |
| `src/app/api/onboarding/route.ts` | `investorStrategy.createMany` in transaction; legacy `strategy` String mirrored from first selection |
| `src/app/admin/investors/[id]/page.tsx` | Chip display + legacyToStrategies fallback |
| `tests/lib/strategies.test.ts` | New — 7 tests (catalog + legacy mapping) |
| `tests/lib/onboarding-schemas.test.ts` | Updated; +2 tests (empty array rejected, multi-strategy accepted) |
| `tests/api/onboarding.test.ts` | Updated; `investorStrategy.createMany` mocked |

## Verification

- Build: ✅
- Tests: ✅ 102/102 pass (was 93, added 9)

## Gaps closed
- R11 ✅ Multi-select strategy; Any/All inconsistency removed

## Now ready for Phase 4

With both `TargetArea` (2.1) and `InvestorStrategy` (2.2) shipped, the
deal-investor auto-match query is now straightforward:

```ts
prisma.investorProfile.findMany({
  where: {
    structuredAreas: { some: { code: { in: dealAreaCodes } } },
    strategies: { some: { strategy: dealStrategy } },
    budgetMin: { lte: dealAskingPrice },
    budgetMax: { gte: dealAskingPrice },
    application: { status: 'ACTIVE_INVESTOR' },
  },
})
```
