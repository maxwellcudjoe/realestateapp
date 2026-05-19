---
title: "PR #8 — Schema-blocked audit items: C6 atomic counter + L1 drop + M1 PoF audit trail"
date: "2026-05-19"
language: "typescript"
status: "complete"
tags: [audit-followup, schema-migration, invoice-counter, pof, audit-trail]
---

# PR #8 — Schema-blocked audit items shipped

Closes the three audit items that needed a schema push, now that the Azure SQL firewall whitelist landed for IP `154.161.38.129`.

## Schema changes (pushed via `prisma db push`)

```prisma
// New model — atomic invoice numbering
model InvoiceCounter {
  prefix String @id @db.NVarChar(15)   // "RB-2026"
  seq    Int    @default(0)
}

// Document — added supersededAt for PoF audit trail
model Document {
  // ...existing fields...
  supersededAt  DateTime?    // M1 — null = current, set = soft-deleted
}

// Invoice — dropped unused field
model Invoice {
  // pdfBlobPath REMOVED  ← L1
}
```

## C6 — Atomic `nextInvoiceNumber` via `InvoiceCounter` upsert

`src/lib/invoice-numbering.ts`:

```ts
const counter = await prisma.invoiceCounter.upsert({
  where: { prefix },                    // "RB-2026"
  create: { prefix, seq: 1 },
  update: { seq: { increment: 1 } },
})
return `${prefix}-${String(counter.seq).padStart(4, '0')}`
```

The `update: { seq: { increment: 1 } }` Prisma idiom compiles to a SQL `UPDATE ... SET seq = seq + 1` — SQL Server takes the row's update lock so concurrent issuances serialize at the DB level. No more max-query-then-create race. No more retry-on-P2002 surface. Gaps don't happen because the counter increments independently of whether the resulting Invoice row commits.

Existing P2002 retry loops in the calling routes (`/api/admin/invoices` POST and `/api/admin/subscriptions/generate-renewals` POST) are now defensive-only — kept in case some other concurrent path writes invoice numbers (manual import, future bulk loader).

## L1 — Dropped `Invoice.pdfBlobPath`

The field was reserved in Phase 7B for "PDF archival to blob on issue" but never written. PDFs are rendered on-demand by `src/lib/pdf-invoice.tsx`. Removed from the schema + pushed (`--accept-data-loss` to drop the column). No code referenced it.

If audit-immutable PDFs become a requirement later, re-add the field + populate at the SENT transition.

## M1 — PoF `supersededAt` for AML evidence chain

The audit flagged that hard-deleting prior PoF on re-upload destroyed the evidence that backed any earlier viewing-request or offer. Now:

- `Document.supersededAt DateTime?` — null on active, set to `now` when superseded
- `src/lib/proof-of-funds.ts` — `hasActiveProofOfFunds` + `getMostRecentProofOfFunds` both filter `supersededAt: null`
- `src/app/api/portal/proof-of-funds/route.ts` — replaces `deleteMany` (+ L7 blob cleanup) with `updateMany({ supersededAt: now })` and **keeps the blob** intentionally. The whole point is preserving the file for audit; deleting the blob would defeat M1.

L7's blob cleanup remains intact for other doc replacement flows (KYC PASSPORT/PROOF_OF_ADDRESS/SOURCE_OF_FUNDS in `/api/portal/documents`) and for explicit doc DELETE endpoints — those aren't AML-evidence-sensitive in the same way.

## Tests (+1 test, ~7 updated mocks)

- `tests/lib/invoices.test.ts` — `nextInvoiceNumber` block rewritten for the counter approach: 4 cases (first-use seq=1, increment seq=43, padding for seq=10, correct upsert clause shape with prefix/create/update).
- `tests/api/invoices.test.ts` — POST mock setup swapped `mockInvoiceFindFirst.mockResolvedValue(null)` for `mockInvoiceCounterUpsert.mockResolvedValue({ prefix: 'RB-2026', seq: 1 })`. Added `invoiceCounter` + `auditEvent` to the prisma mock root.
- `tests/api/subscriptions.test.ts` — same prisma mock additions for the renewal generator. Removed leftover `mockResolvedValueOnce(null)` for the no-longer-needed nextInvoiceNumber findFirst lookup (the queue was bleeding across tests).

## Verification

- 374/374 tests pass (was 373 → +1 new C6 upsert-shape test, +rewrites)
- Production build clean
- Two Azure SQL schema pushes (4.71s + 5.18s)

## Side-effect of C6: a sequence-gap behavior change

Old behavior: invoice numbers came from the max(invoiceNumber) of existing rows. If you VOIDED the last invoice and issued a new one, numbering re-used the gap (which is fine for accounting purposes but weird for audit).

New behavior: the counter is monotonic — VOIDed/deleted invoices leave their number behind, never reused. This is the right behaviour for a UK accounting trail (invoices should never share a number, even voided ones).

## Audit close-out — FINAL

| Severity | Closed | Open |
|---|---|---|
| CRITICAL | **7 of 7** (C1, C3, C4, C5, C6, C7, C8) | — |
| HIGH | **6 of 6** | — |
| MEDIUM | **7 of 9** (M1 + previous) | M5 (cosmetic cache header), M8 (verified safe) |
| LOW | **6 of 7** (L1 + previous) | L3 (user-owned files) |

**26 of 29 items closed.** Remaining 3 are either cosmetic (M5), verified safe (M8), or user-action items (L3).
