---
title: Admin Workflow — Investor Lifecycle (Start to Finish)
date: 2026-05-17
language: TypeScript / Next.js
status: complete
tags: [admin, workflow, kyc, investor, revebatir]
---

# Admin Workflow — Investor Lifecycle (Start to Finish)

## Overview

Every investor goes through 7 stages. The admin drives all transitions
from the Operations Dashboard. Each transition automatically updates the
investor's portal timeline and (where applicable) gates what they can do next.

---

## The 7 Stages

| Stage | Status Key | Who Acts | What Happens |
|---|---|---|---|
| 1 | `SUBMITTED` | — | Investor completes onboarding. Auto-created. |
| 2 | `UNDER_REVIEW` | Admin | Admin opens the application and begins review. |
| 3 | `DOCUMENTS_REQUESTED` | Admin | Admin requests KYC documents. Investor portal unlocks upload page. |
| 4 | `DOCUMENTS_RECEIVED` | Admin | Admin confirms docs uploaded. Begins verification. |
| 5 | `KYC_APPROVED` | Admin | Identity verified. Investor profile goes live. |
| 6 | `ACTIVE_INVESTOR` | Admin | Investor is added to deal distribution list. |
| 7 | `DEAL_SENT` | Admin | A deal matching their criteria has been sent. |

---

## Step-by-Step Admin Workflow

### Step 1 — New Application Arrives
- Email notification sent to `info@revebatir.co.uk` automatically on submission.
- Log in at `/login` → lands on `/admin/investors`.
- See application in the table with status `SUBMITTED`.

### Step 2 — Open the Application
- Click the investor's row → goes to `/admin/investors/[id]`.
- See three panels:
  - **Left:** Full investor profile (name, email, phone, address, budget, strategy, buyer type, target areas)
  - **Centre:** KYC Documents (empty until uploaded)
  - **Right:** Status & Actions panel

### Step 3 — Move to UNDER_REVIEW
- In the **Status & Actions** panel (right column):
  - Select `UNDER REVIEW` from the dropdown
  - Optionally add a **Note to Investor** (shown in their portal timeline)
  - Optionally add **Internal Notes** (private, never shown to investor)
  - Click **Update Status**
- Investor's portal timeline now shows "Under Review" as the active step.

### Step 4 — Request KYC Documents
- Select `DOCUMENTS REQUESTED` → add a note like:
  > "Please upload your passport, proof of address, and source of funds."
- Click **Update Status**.
- This **unlocks** the investor's Documents page at `/portal/documents`.
- The investor sees the upload slots for: Passport, Proof of Address, Source of Funds.

### Step 5 — Investor Uploads Documents
- The investor logs into their portal, goes to Documents, uploads all 3 files.
- The centre panel on the investor's admin detail page now shows the uploaded documents with **View** links (click to open the file from Azure Blob Storage).

### Step 6 — Review Documents & Move to DOCUMENTS_RECEIVED
- Click **View** on each document to open the file.
- Once reviewed, select `DOCUMENTS RECEIVED` → click **Update Status**.

### Step 7 — Approve KYC
- After verifying identity, select `KYC APPROVED`.
- Optionally note: "Identity verified. Welcome aboard."
- Click **Update Status**.

### Step 8 — Activate Investor
- Select `ACTIVE INVESTOR` → click **Update Status**.
- Investor is now live in the system and ready to receive deals.

### Step 9 — Send a Deal
- When a property deal matches their criteria, select `DEAL SENT`.
- Add a note describing the deal or confirming it was sent separately.

---

## What Each Panel Does

### Left Panel — Investor Profile
Read-only. Shows everything the investor submitted:
email, phone, address, budget range, investment strategy (BTL/HMO/Flip/All),
buyer type (cash/mortgage), and target areas.

### Centre Panel — KYC Documents
Shows uploaded documents. Each has a **View** link that generates a
secure 5-minute pre-signed Azure Blob Storage URL. Only visible to admins.

### Right Panel — Status & Actions
Three controls:
1. **Change Status** dropdown — select any of the 7 stages
2. **Note to Investor** — text shown in the investor's portal timeline
3. **Internal Notes** — private admin memo, never visible to investor

Click **Update Status** to save.

---

## Investor's Parallel View (Portal)

Everything the admin does is mirrored in real time on the investor's portal:
- `/portal/status` — shows the full 7-stage timeline, highlighting current stage,
  displaying any note the admin attached, and timestamped history entries.
- `/portal/documents` — only accessible when status is `DOCUMENTS_REQUESTED`.
  Shows three upload slots; investor submits all three then clicks Submit.

---

## Key Business Rules (enforced by code)

- The document upload page is only accessible when `status === 'DOCUMENTS_REQUESTED'`.
- The Submit Documents button only appears after all 3 documents are uploaded.
- Submitting documents automatically changes status to `DOCUMENTS_RECEIVED`.
- Every status change is logged in the `StatusHistory` table with timestamp and optional note.
- Documents are stored in Azure Blob (`revebatir-kyc` container) with `{applicationId}/{type}/{filename}` paths.
- Document View URLs expire after 5 minutes (SAS token).
