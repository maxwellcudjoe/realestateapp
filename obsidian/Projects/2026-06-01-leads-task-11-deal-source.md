---
title: Leads Task 11 — Deal source attribution
date: 2026-06-01
language: TypeScript / Next.js / Prisma
status: shipped
tags: [leads, deals, audit, admin]
---

# Leads Task 11 — Deal source attribution

Extends the admin deal-create endpoint with four optional source-attribution
fields (channel, lead ID, dealer-contact ID, free-text note), adds a
`DealSourcePicker` component slotted into the existing admin post-deal form,
and emits a `DEAL_SOURCE_ATTRIBUTED` audit event whenever any of the four
fields are populated. Schema for these columns already exists on `Deal`
(Leads Task 1).

## Surface

- **Route extended**: `src/app/api/admin/investors/[id]/deals/route.ts`
  - Zod schema picks up `sourceChannel` (enum of 6 values), `sourceLeadId`,
    `sourceContactId`, `sourceNote` (≤ 5000 chars). All optional.
  - FK pre-validation: if `sourceLeadId` is set we `lead.findUnique` it
    and 400 on miss; same for `dealerContact.findUnique` for
    `sourceContactId`. Fail fast before the create.
  - On successful create, when any source field is populated, write
    `recordAudit({ action: 'DEAL_SOURCE_ATTRIBUTED', resourceType: 'Deal',
    resourceId: deal.id, metadata: { sourceChannel, sourceLeadId,
    sourceContactId } })`. Note is intentionally omitted from metadata
    (PII / free text — keep audit metadata structured).

- **New component**: `src/components/admin/DealSourcePicker.tsx`
  - Controlled (`value` + `onChange`) so it composes with the existing
    state-lifted `AdminPostDealForm`. Channel `<select>`, two ID inputs,
    one note textarea. Styled with the project's carbon/ivory/gold
    palette to match the rest of the admin form.

- **Form integration**: `src/components/admin/AdminPostDealForm.tsx`
  - Adds a `source` state object, posts the four fields in the JSON body
    (sent as `undefined` when empty so the route's Zod `.optional()` is
    honoured), resets on success, and renders `<DealSourcePicker />` just
    above the error/success row.

## Tests

`tests/api/admin-deal-source.test.ts` (5 cases, all passing):

1. Persists source fields when provided.
2. Records `DEAL_SOURCE_ATTRIBUTED` audit when any source field is set.
3. 400 when `sourceLeadId` references an unknown Lead.
4. 400 when `sourceContactId` references an unknown DealerContact.
5. Backwards-compatible: deal without source fields still works and no
   source audit is recorded.

`npx vitest run tests/api/admin-deal-source.test.ts` → 5/5 pass.
`npx tsc --noEmit` → no new errors in any of the touched files.

## Acceptance

- [x] Route accepts and persists 4 source fields
- [x] FK validation on lead/contact IDs (400 on miss)
- [x] `DEAL_SOURCE_ATTRIBUTED` audit fires when any source field set
- [x] Backwards-compatible when no source fields supplied
- [x] Picker component slotted into existing form, controlled API
- [x] Tests passing, tsc clean for touched files

📁 Save this note to: obsidian/Projects/2026-06-01-leads-task-11-deal-source.md
