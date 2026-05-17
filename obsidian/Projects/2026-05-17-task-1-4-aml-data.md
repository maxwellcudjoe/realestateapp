---
title: "Task 1.4 — AML Data Capture (PEP, DOB, Nationality, Source of Funds)"
date: "2026-05-17"
language: "TypeScript / Next.js / Prisma"
status: complete
tags: [compliance, aml, mlr-2017, kyc, phase-1, R4, R5, R6]
---

# Task 1.4 — AML Data Capture

Closes gaps **R4** (PEP screening), **R5** (DOB / nationality / tax residency / NI),
and **R6** (structured source-of-funds). Brings the platform in line with
UK MLR 2017 data-capture requirements for regulated firms.

> **Compliance note:** the schema, validation, and UI shipped here should be
> reviewed by a compliance advisor before public launch. The fields and
> wording follow common MLR 2017 patterns but are not a substitute for legal
> sign-off.

## Schema

```prisma
model InvestorProfile {
  // ...existing
  dateOfBirth         DateTime?
  nationality         String?   @db.NVarChar(2)   // ISO 3166-1 alpha-2
  taxResidency        String?   @db.NVarChar(2)
  niNumber            String?   @db.NVarChar(20)
  isPep               Boolean   @default(false)
  pepDetails          String?   @db.NVarChar(Max)
  sourceOfFunds       String?   @db.NVarChar(30)   // SAVINGS | PROPERTY_SALE | INHERITANCE | GIFT | BUSINESS_PROFITS | INVESTMENT_RETURNS | PENSION | OTHER
  sourceOfFundsDetail String?   @db.NVarChar(Max)
  complianceCompleted Boolean   @default(false)
}
```

All new compliance fields nullable so existing rows don't break. The
`complianceCompleted` flag flips to `true` for any new submission and stays
`false` for legacy accounts — admin can see this at a glance in the
Compliance panel.

## Shared lib (`src/lib/compliance.ts`)

- `COUNTRIES` — 29 common-first country codes + `OT` "Other" fallback
- `SOURCE_OF_FUNDS_OPTIONS` — 8 enum values with display labels
- `NI_NUMBER_REGEX` — UK National Insurance format `QQ123456C` (excludes invalid initial letters)
- `ageOn(dob, on?)` — computes age, leap-day correct
- `looksLikeNiNumber(s)` — strips whitespace, regex-checks

## Wizard — 4 steps → 5 steps

New `StepCompliance` inserted after `StepPersonal`, before `StepCriteria`.
Ordering rationale: keep the heaviest step in the middle, after the user has
already invested effort in the form, but before the lighter Criteria step.

### Field-level UX

- DOB: `<input type="date">` with ≥18 + ≤120 validation
- Nationality + Tax Residency: separate country dropdowns (both default 'GB')
- NI Number: **only shown** if taxResidency = GB; validates against regex; allowed to be empty
- Source of Funds: dropdown; when 'OTHER' selected, free-text "please describe" field appears (min 5 chars)
- PEP checkbox with educational copy explaining what a PEP is and that it does NOT exclude them — just triggers EDD; conditional details textarea appears below

## Admin Compliance panel

New full-width panel on `/admin/investors/[id]`, below the existing 3-column
layout. Shows:
- DOB + computed age
- Nationality + Tax Residency (with **+2% SDLT surcharge** badge if non-GB)
- NI Number in monospace
- Source of Funds (label + free-text detail in italics if present)
- PEP status with prominent gold warning + "Enhanced Due Diligence required" tag when true
- Marketing consent date

"Legacy account — data missing" tag when `complianceCompleted = false`.

## Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | +9 fields on InvestorProfile |
| `src/lib/compliance.ts` | New — constants + helpers |
| `src/lib/schemas/onboarding.ts` | +stepComplianceSchema; +compliance fields on onboardingSubmitSchema with cross-field refines |
| `src/components/onboarding/StepCompliance.tsx` | New — 9 fields with conditional rendering |
| `src/components/onboarding/WizardProgress.tsx` | 4 → 5 steps |
| `src/app/onboarding/page.tsx` | Wires new step at index 2 |
| `src/app/api/onboarding/route.ts` | Persists all compliance fields; normalises NI number |
| `src/app/admin/investors/[id]/page.tsx` | New Compliance panel with SDLT surcharge flag + PEP warning |
| `tests/lib/compliance.test.ts` | New — 14 tests |
| `tests/lib/onboarding-schemas.test.ts` | Updated fixtures |
| `tests/api/onboarding.test.ts` | Updated fixtures |

## Cross-field validation rules

| Trigger | Requirement |
|---|---|
| `isPep = true` | `pepDetails` must be ≥5 chars |
| `sourceOfFunds = 'OTHER'` | `sourceOfFundsDetail` must be ≥5 chars |
| `taxResidency = 'GB'` and `niNumber` provided | Must match `^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$` |
| `dateOfBirth` | Implied age must be 18–120 |

## Verification

- Build: ✅ 38 pages
- Tests: ✅ 88/88 pass (was 74, added 14)

## Gaps closed
- R4 ✅ PEP screening (with educational copy + EDD flag)
- R5 ✅ DOB / nationality / tax residency / NI number
- R6 ✅ Structured source-of-funds (8-value enum + optional detail)

## Not yet closed (deferred to later phases)

- Profile-edit page (Task 2.8) — legacy accounts can't yet fill in missing compliance data themselves. Until 2.8 ships, admins must manually contact those investors. They're flagged in the admin panel.
- KYC provider integration (Task 6.1) — these fields are stored, not yet verified against an external service like Onfido.
