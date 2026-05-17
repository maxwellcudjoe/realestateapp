---
title: "Task 7.3 — Rêve Bâtir invoicing (sourcing, success, subscription)"
date: "2026-05-17"
language: "typescript"
status: "complete"
tags: [phase-7, invoicing, pdf, revenue, schema]
---

# Task 7.3 — Rêve Bâtir invoicing

Three-type invoice system (SOURCING, SUCCESS, SUBSCRIPTION) for Rêve Bâtir's own fees. Solicitor-only money model: all invoices paid by bank transfer, admin marks PAID with the transfer reference. PDF rendered on-demand server-side via `@react-pdf/renderer`.

## Schema

```prisma
model Invoice {
  id              String    @id @default(cuid())
  invoiceNumber   String    @unique @db.NVarChar(30)   // RB-YYYY-NNNN
  userId          String
  dealId          String?
  type            String    @db.NVarChar(20)            // SOURCING | SUCCESS | SUBSCRIPTION
  amount          Decimal   @db.Decimal(12, 2)
  description     String    @db.NVarChar(500)
  status          String    @default("DRAFT") @db.NVarChar(20)  // DRAFT | SENT | PAID | VOID
  issuedAt        DateTime?
  dueAt           DateTime?
  paidAt          DateTime?
  paidReference   String?   @db.NVarChar(255)
  pdfBlobPath     String?   @db.NVarChar(500)  // reserved — currently rendering on-demand
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  @@index([userId, createdAt]) @@index([dealId]) @@index([status, dueAt])
}
```

Pushed to Azure SQL with `npx prisma db push` (7.31s).

## Files

### Libraries
- `src/lib/invoices.ts` — pure browser-safe helpers: types, status transitions, `successFeePercent()` (env-driven), `calculateSuccessFee(price, pct)`, `defaultDueDate(issued)`, `canTransition()`, `getBankDetails()` (env-driven), labels.
- `src/lib/invoice-numbering.ts` — server-only `nextInvoiceNumber()` using Prisma (`RB-YYYY-NNNN`, retry-once on UNIQUE collision). Kept separate so client components can import from `@/lib/invoices` without dragging mssql into the bundle.
- `src/lib/pdf-invoice.tsx` — `@react-pdf/renderer` invoice template + `renderInvoicePdf(data)` returning a `Buffer`. A4, ivory + gold accents matching brand. Includes bank details for transfer.

### API
- `POST/GET /api/admin/invoices` — create + list (admin-scoped, optionally filtered by userId)
- `PATCH /api/admin/invoices/[id]` — status transitions (SENT, PAID with required `paidReference`, VOID) + DRAFT-only field edits
- `DELETE /api/admin/invoices/[id]` — DRAFT only
- `GET /api/admin/invoices/[id]/pdf` — admin downloads any invoice PDF
- `GET /api/portal/invoices` — investor reads own invoices (SENT + PAID only, VOID/DRAFT hidden)
- `GET /api/portal/invoices/[id]/pdf` — investor downloads own invoice PDF

### UI
- `/portal/invoices` (investor) — outstanding balance card, list with status chips (Sent/Overdue/Paid), click-row to open PDF in new tab.
- `/admin/investors/[id]/invoices` (admin) — outstanding + lifetime-paid totals, full invoice list, "New invoice" + per-row "Mark paid"/"Void" actions.
- Deal detail page (admin) — new "Invoices for this deal" panel above Viewings: lists deal invoices + conditional quick-action buttons:
  - "Issue sourcing invoice" appears once stage ≥ OFFER_ACCEPTED
  - "Issue success invoice (suggested £X)" appears on COMPLETED — auto-fills with `askingPrice × REVE_BATIR_SUCCESS_FEE_PCT / 100`
- `InvoiceIssuer` client component — collapsible inline form (no modal), pre-fills type/amount/description, "Send now" is default.
- `InvoiceMarkPaid` client component — inline reference input, single-click void.
- `Invoices` tab added to portal nav layout.
- "View Invoices →" link added to admin investor detail page.

### Email
- Created/Sent: subject "Invoice {number} from Rêve Bâtir — {type}", body with amount + description + due date + link to portal.
- Marked PAID: subject "Receipt — Invoice {number} paid", body with amount + reference + link.
- Both non-fatal (try/catch — invoice creation succeeds even if email fails).

### Env vars

```
REVE_BATIR_SUCCESS_FEE_PCT=1.5                # default for success-fee suggestions
REVE_BATIR_BANK_NAME="Lloyds Bank"
REVE_BATIR_BANK_SORT_CODE="30-00-00"
REVE_BATIR_BANK_ACCOUNT="00000000"
REVE_BATIR_BANK_ACCOUNT_NAME="Reve Batir Ltd"
REVE_BATIR_VAT_NUMBER="GB000000000"           # optional — appears on PDF if set
```

All have safe defaults — feature works without env config but bank details on the PDF will be placeholders.

## Tests

- `tests/lib/invoices.test.ts` (15) — types/statuses, successFeePercent env handling, calculateSuccessFee rounding, defaultDueDate, canTransition matrix (DRAFT→SENT/VOID, SENT→PAID/VOID, terminal blocks, DRAFT→PAID blocked), nextInvoiceNumber (no-prior, increment, padding), getBankDetails env handling.
- `tests/api/invoices.test.ts` (12) — POST (non-admin 403, invalid type 400, invalid amount 400, 404 user, creates SENT invoice with auto-number, creates DRAFT when sendNow=false), PATCH (non-admin 403, DRAFT→PAID 409, PAID requires reference, marks PAID with reference, refuses edit on non-DRAFT, voids issued invoice).

## Design notes

- **Numbering is per-year**: `RB-2026-0001` resets to `0001` on January 1. Tested.
- **On-demand PDF rendering**: no blob storage for PDFs. Saves cost, no immutability guarantee — if env defaults change, old invoices reflect new bank details. If audit needs immutable PDFs later, populate `pdfBlobPath` on issue.
- **No DRAFT workflow in v1 UX**: `InvoiceIssuer` always sends with `sendNow=true`. The DRAFT state + edit-while-DRAFT code paths exist in the API for completeness but aren't surfaced. Easy to expose later.
- **Per-deal cap**: the "Issue success/sourcing invoice" buttons disappear once a non-VOID invoice of that type exists for the deal. Prevents accidental double-billing. Admin can still issue duplicates via the all-invoices page if needed.
