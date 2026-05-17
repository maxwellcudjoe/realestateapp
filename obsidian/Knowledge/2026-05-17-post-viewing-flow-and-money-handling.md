---
title: "Post-viewing flow & money handling — current state, gaps, and product decisions"
date: "2026-05-17"
language: "general"
status: "decisions-locked"
tags: [process-gap, viewings, deals, invoicing, conveyancing, roadmap]
---

# Post-viewing flow & money handling — current state and gaps

## Product decisions (locked 2026-05-17)

1. **Money flow: solicitor-only.** No Stripe, no GoCardless, no escrow on platform. All conveyancing money (reservation, exchange deposit, completion balance, SDLT, legal fees) stays off-platform via solicitor client accounts. The platform's role is record-keeping + status visibility, not money movement.
2. **Rêve Bâtir charges three fee types: sourcing, success, subscription.** These are the company's own revenue lines, paid by investors to Rêve Bâtir (not to vendors). Even though we don't collect them via card, we **must** invoice them, track payment, and produce PDF receipts. → Invoice model is now **required scope**, not optional.

These decisions shape the revised plan at the bottom of this note.

---

> **Question:** After a client books a date for a viewing and the admin confirms it, what is the next step in the process? And how are the money transactions handled in the flow?

---

## Short answer

1. **After CONFIRMED, the flow stops.** The system does nothing automated. The investor is expected to attend the viewing, then either (a) walk away or (b) submit a structured Offer via `OfferForm` on the deal page — but **no UI prompts them to**. After the viewing, admin must manually flip the `Viewing.status` to `COMPLETED` and (separately) advance the `Deal.stage` to `OFFER_PENDING` once an offer goes in. The two timelines run side-by-side and are not linked.
2. **No money ever moves through the platform.** There is no payment processor (no Stripe, no PayPal, no escrow integration). All cash flows — reservation fee, 10% exchange deposit, completion balance, SDLT, legal fees, Rêve Bâtir's sourcing fee (if any) — happen **off-platform via solicitors**. `FinancialSummary.tsx` is a **calculator** showing the buyer what they will need; `Offer.depositPercent` is a **commitment statement**, not a captured payment.

Whether either of these is a feature gap or intentional scope is a product decision — they're called out below with proposed fixes.

---

## What the code actually does today

### Viewing lifecycle

`Viewing` model — `prisma/schema.prisma:286-301`:

```
status: REQUESTED | CONFIRMED | DECLINED | COMPLETED | CANCELLED
```

- **Investor requests** via `POST /api/portal/deals/[dealId]/viewings` (`src/app/api/portal/deals/[dealId]/viewings/route.ts:52-105`) — picks preferred slot + optional alternative + note → emails admin.
- **Admin confirms** via `PATCH /api/admin/viewings/[viewingId]` (`src/app/api/admin/viewings/[viewingId]/route.ts`) — sets `status='CONFIRMED'`, writes `confirmedSlot`, creates a `VIEWING` notification, sends investor an email with the slot.
- **After that, nothing.** No webhook, no scheduled job, no UI prompt. The viewing row sits at CONFIRMED until admin manually PATCHes it to COMPLETED or CANCELLED.
- `ViewingPanel` (`src/components/portal/ViewingPanel.tsx`) only renders the AdminDecide controls when `status === 'REQUESTED'`. Once CONFIRMED, the admin sees the timestamp + status badge but **no further action affordance**. To mark a viewing COMPLETED today you would need to call the API directly — there is no button.

### Deal pipeline (separate from viewings)

`src/lib/deal-stages.ts` — 10 stages:

```
PROPOSED → OFFER_PENDING → OFFER_ACCEPTED → MEMO_OF_SALE
→ CONVEYANCING → SURVEY → MORTGAGE → EXCHANGED → COMPLETED
+ FALLEN_THROUGH (terminal failure)
```

- Stage advancement is **manual admin action** via `PATCH /api/admin/deals/[dealId]/stage`. Comment in `deal-stages.ts:2-3` explicitly says forward path is "suggested but not enforced — admin can move freely."
- Submitting an Offer (`POST /api/portal/deals/[dealId]/offer`) does **not** automatically advance the deal to OFFER_PENDING. The admin must do that step themselves after reviewing the offer.

### Where money sits in the data model

| Thing                          | Where it lives                                          | Is money captured? |
|--------------------------------|---------------------------------------------------------|--------------------|
| Buyer's stated funds at signup | `InvestorProfile.depositAvailable` (Decimal)            | No — self-report   |
| Offer commitment               | `Offer.amount`, `Offer.depositPercent`                  | No — intent only   |
| SDLT estimate                  | `src/lib/sdlt.ts` + `FinancialSummary.tsx` (calculator) | No — info only     |
| Completion price               | `Property.purchasePrice` (auto-created at COMPLETED)    | No — record only   |
| Reservation fee / holding dep  | **Does not exist**                                      | No                 |
| Exchange deposit (10%)         | **Does not exist**                                      | No                 |
| Completion balance             | **Does not exist**                                      | No                 |
| Rêve Bâtir fees                | **Does not exist**                                      | No                 |
| Proof of funds                 | Not enforced as a doc requirement before offer/viewing  | No                 |

A full `Grep` of `src/` for `stripe|payment|escrow|reservation|invoice` returned only references to `depositAvailable`, `depositPercent`, and `FinancialSummary` — no actual payment plumbing.

---

## Gap A — Post-viewing handoff dead-zone

**Current**: viewing CONFIRMED → silence. The investor attends, comes home, has no in-platform action to take. The admin has no button to mark it COMPLETED or to nudge the deal forward. Two pipelines (Viewing.status and Deal.stage) drift apart with no link.

**User impact**: this is the highest-friction moment of the entire journey — right after a real-world viewing is exactly when investors are deciding to proceed. We hand them silence.

**Proposed fix (small, ~1 day)**:

1. **Admin** — add a "Mark completed" + "Cancel" action to `ViewingPanel`'s admin controls when `status === 'CONFIRMED'`. (Currently AdminDecide only renders on REQUESTED.)
2. **Investor** — after the confirmed slot has passed (or after admin marks COMPLETED), surface a card on `/portal/deals/[dealId]` saying:
   > "You viewed this property on [date]. Ready to make an offer? [Submit offer →] [Pass]"
3. **Auto-advance stage suggestion** (not enforcement) — when an `Offer` is created via `POST /api/portal/deals/[dealId]/offer`, surface a banner on the admin deal detail page: "New offer received — move deal to OFFER_PENDING?" with a one-click stage transition.
4. **Optional** — when viewing flips to COMPLETED, create a `Notification` with type `VIEWING_FOLLOWUP` linking the investor to the offer form.

This closes the dead-zone without adding payment complexity.

---

## Gap B — No money handling anywhere

**Current**: zero payment integration. All money flows off-platform via solicitors, which is the **correct default** for UK conveyancing (regulated client-account handling, fraud protection, anti-money-laundering reasons). However, three places where on-platform money handling is normal for an investor sourcing platform are missing:

### B1 — Reservation / holding fee (most common in sourcing)

For off-market sourced deals, agents typically take a **£500–£5,000 reservation fee** at OFFER_ACCEPTED to take the property off market while conveyancing starts. Currently not captured. This is the most common money type for an investor sourcing platform.

Options:
- **Don't capture** — keep it bank-transfer to client account, just track the receipt date as a deal field.
- **Stripe Connect** — proper payment intent, refundable if deal falls through. ~1 week of work + KYC for Rêve Bâtir as merchant.
- **GoCardless** — Direct Debit / bank transfer with reconciliation. UK-native, lower fees than cards.

### B2 — Exchange deposit (10%)

Always handled solicitor-to-solicitor. **No reason to put this on platform**. We should however **display confirmation** when the solicitor reports it received, so the investor sees a green tick on the EXCHANGED stage.

### B3 — Rêve Bâtir's own fees

If the business charges a sourcing fee, finder's fee, or success fee on top of the deal price, there's currently no invoice mechanism. Options:
- Add an `Invoice` model with `dealId`, `amount`, `status (DRAFT|SENT|PAID|VOID)`, `dueAt`, `paidAt`, `invoiceNumber`, `pdfBlobPath`.
- Stripe Invoicing (no payment integration required for receive-only).
- Just send a PDF via email and track status manually.

### B4 — Proof of funds gate

Currently `depositAvailable` is self-reported at signup with no document evidence. Best practice: **block viewing or offer submission** until the investor uploads a recent bank statement / mortgage AIP / solicitor's letter as a `Document` with `type='PROOF_OF_FUNDS'`. Reduces tyre-kicker volume dramatically and is what serious sourcing platforms do.

---

## Revised plan (after product decisions)

Proposed as **Phase 7 — Post-viewing handoff + Rêve Bâtir invoicing**.

| # | Item                                                | Effort   | Status                                |
|---|-----------------------------------------------------|----------|---------------------------------------|
| 1 | Gap A — post-viewing handoff card + admin buttons   | ~1 day   | Recommended first (no money risk)     |
| 2 | Proof-of-funds gate before viewing/offer            | ~½ day   | Quality filter                        |
| 3 | Invoice model + admin issue + investor view + PDF   | ~2–3 day | **Required** — Rêve Bâtir revenue     |
| 4 | Subscription engine (recurring invoices + renewal)  | ~1–2 day | Depends on subscription model         |
| ~~5~~ | ~~Reservation-fee capture on platform~~         | —        | ❌ Out of scope (solicitor handles)    |
| ~~6~~ | ~~Stripe Connect / GoCardless~~                  | —        | ❌ Out of scope (solicitor-only)       |

Item 1 ships independently. Items 3+4 share schema and ship together.

---

## Open structural questions (to be answered before schema design)

1. **Subscription model**: who pays it (all approved investors, or only a "premium" tier with deal preview rights)? Monthly or annual? Starts when (on activation, on first deal sent)?
2. **Sourcing fee shape**: flat amount per deal, or % of purchase price? Triggered when (OFFER_ACCEPTED, MEMO_OF_SALE, manual)?
3. **Success fee shape**: % of purchase price (typical 1–2%), or flat? Triggered on COMPLETED?
4. **Per-investor overrides**: do all investors pay the same headline rates, or can admin set custom fee deals per investor (white-glove pricing)?

These determine whether we store rates centrally vs per-invoice, whether to auto-generate on stage transitions, and whether to model `FeeConfig` separately.

---

## Source files referenced

- `prisma/schema.prisma:286-301` — `Viewing` model
- `prisma/schema.prisma:330-343` — `Offer` model
- `prisma/schema.prisma:219-259` — `Deal` model
- `src/lib/deal-stages.ts` — 10-stage pipeline
- `src/app/api/admin/viewings/[viewingId]/route.ts` — admin CONFIRM/DECLINE/COMPLETE/CANCEL
- `src/app/api/portal/deals/[dealId]/viewings/route.ts` — investor request flow
- `src/components/portal/ViewingPanel.tsx` — UI (admin controls only render for REQUESTED status)
- `src/components/portal/FinancialSummary.tsx` — SDLT calculator (info only, no payments)
- `src/components/portal/OfferForm.tsx` + `src/app/api/portal/deals/[dealId]/offer/route.ts` — offer submission (no stage auto-advance)
