---
title: "Task 2.1 — Structured Target Areas"
date: "2026-05-17"
language: "TypeScript / Next.js / Prisma"
status: complete
tags: [matching, ux, phase-2, R10]
---

# Task 2.1 — Structured Target Areas

Closes gap **R10** (free-text targetAreas blocks matching). Replaces the free
form with a curated UK areas catalog and a queryable many-to-one relation.
Unlocks Phase 4 auto-matching ("show me all investors targeting Manchester").

## Schema

```prisma
model TargetArea {
  id                String          @id @default(cuid())
  investorProfileId String
  investorProfile   InvestorProfile @relation(fields: [investorProfileId], references: [id], onDelete: Cascade)
  code              String          @db.NVarChar(30)
  label             String          @db.NVarChar(100)
  createdAt         DateTime        @default(now())

  @@unique([investorProfileId, code])
  @@index([code])
}
```

`InvestorProfile.targetAreas` (free text) is **preserved** for now — populated
with the joined labels of the structured rows so any unmigrated reader still
gets a sensible value. Will be dropped in a later sweep.

## Catalog (`src/lib/target-areas.ts`)

54 curated UK areas across 7 groups: London (7 zones), North West, Yorkshire
& North East, Midlands, South & South West, Wales, Scotland, Northern Ireland.
Each entry has a stable `code` (DB-safe slug like `manchester`) and human label
(`Manchester (M)`). Codes never change once shipped; new ones can be added freely.

## UI

`TargetAreaPicker`:
- Selected items rendered as removable chips at the top
- Search input filters across all entries
- Without query: shows grouped list with sticky group headers
- Checkbox toggles
- Replaces the previous single-line text input in `StepCriteria`

Review step now shows comma-joined labels for the selected codes.

## Admin

Investor detail page now renders target areas as gold chips when structured
data exists; falls back to the legacy free-text for old accounts.

## Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | +TargetArea model, +structuredAreas relation |
| `src/lib/target-areas.ts` | New — 54 areas, helpers |
| `src/components/onboarding/TargetAreaPicker.tsx` | New — multi-select with search + grouping |
| `src/components/onboarding/StepCriteria.tsx` | Replaces text input with picker; switches to `targetAreaCodes` |
| `src/components/onboarding/StepReview.tsx` | Shows joined labels |
| `src/lib/schemas/onboarding.ts` | `targetAreaCodes: string[]` with min 1, max 50, valid-codes refine; legacy targetAreas removed from new schemas |
| `src/app/onboarding/page.tsx` | State shape updated |
| `src/app/api/onboarding/route.ts` | Persists rows via `targetArea.createMany`; populates legacy `targetAreas` string with joined labels |
| `src/app/admin/investors/[id]/page.tsx` | Chip display for structured areas |
| `tests/lib/target-areas.test.ts` | New — 5 tests |
| `tests/lib/onboarding-schemas.test.ts` | Fixtures updated |
| `tests/api/onboarding.test.ts` | Fixtures updated; targetArea.createMany mocked |

## Verification

- Build: ✅
- Tests: ✅ 93/93 pass (was 88, +5)

## Backwards compat notes

- Existing investor profiles still have `targetAreas` populated. The admin
  panel detects empty `structuredAreas` and falls back to that string.
- Profile-edit page (Task 2.8) will let existing users add structured selections
  by mapping their old free text to area codes.

## Gaps closed
- R10 ✅ Structured target areas (unlocks Phase 4 auto-matching)
