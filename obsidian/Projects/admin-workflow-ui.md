---
title: Admin Workflow UI — Guided StatusPanel
date: 2026-05-17
language: TypeScript / React
status: complete
tags: [admin, workflow, ui, statusPanel, investor]
---

# Admin Workflow UI — Guided StatusPanel

## Goal
Replace the raw dropdown StatusPanel with a guided, step-by-step workflow
UI that tells the admin exactly what to do next at each stage.

## What was built

### Stage Progress Indicator
- 7 dots (one per stage) with gold fill for completed, gold outline for current, dark for upcoming.
- Labels alongside each dot showing friendly stage name.

### Next Step Panel
- Displays the logical next action as a primary labelled button.
- Shows the target status name so the admin knows what they're moving to.
- Pre-populates a suggested note in the textarea (admin can edit or accept as-is).
- Clicking the action button submits with the suggested note if the admin left the field blank.

### Suggested Notes per Stage
| From | To | Suggested note |
|---|---|---|
| SUBMITTED | UNDER_REVIEW | Thank you… team has begun reviewing |
| UNDER_REVIEW | DOCUMENTS_REQUESTED | Please upload passport, proof of address, source of funds |
| DOCUMENTS_REQUESTED | DOCUMENTS_RECEIVED | Compliance team reviewing… 5 business days |
| DOCUMENTS_RECEIVED | KYC_APPROVED | Identity verified |
| KYC_APPROVED | ACTIVE_INVESTOR | Profile live, deals incoming |
| ACTIVE_INVESTOR | DEAL_SENT | Deal sent, check email |

### Internal Notes
- Always visible, private textarea — never sent to investor.

### Manual Override
- Collapsed by default. Admin can expand to jump to any stage.
- Uses `variant="secondary"` Button to visually de-emphasise.

## Files changed
- `src/components/admin/StatusPanel.tsx` — full rewrite
