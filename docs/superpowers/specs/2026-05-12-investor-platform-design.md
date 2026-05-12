# Investor Platform Expansion — Design Spec

> **Scope:** Subsystems 1 & 2 — Database/Auth foundation + Investor onboarding wizard + Investor portal + Operations dashboard + Email notifications.
>
> Subsystems 3 & 4 (deal pack assignment, advanced reporting) are out of scope for this sprint.

**Goal:** Transform the Rêve Bâtir Realty marketing site into a full investment platform with KYC/AML-compliant investor onboarding, a team operations dashboard, and automated status notifications — backing up the HMRC AML and ICO compliance claims on the live site.

**Architecture:** Next.js 14 monolith. New route groups (`/onboarding`, `/portal`, `/admin`) added alongside existing marketing pages. Prisma ORM connects to existing AWS RDS MSSQL database. NextAuth.js handles auth with two roles. Azure Blob Storage holds KYC documents. Resend delivers all transactional emails.

**Tech Stack:**
- Framework: Next.js 14 (App Router)
- ORM: Prisma (SQL Server provider)
- Database: AWS RDS — Microsoft SQL Server
- Auth: NextAuth.js v5 (credentials provider + JWT sessions)
- File storage: Azure Blob Storage (private container, pre-signed URLs)
- Email: Resend + React Email (already integrated)
- Validation: Zod v3 (already integrated)
- Styling: Tailwind CSS with existing design tokens

---

## 1. Architecture & Route Structure

### New Routes

```
/onboarding              ← Public multi-step wizard (replaces /register)
                            Single URL — step number tracked in React state only.
                            Steps: 1) Account setup  2) Personal details
                                   3) Investor profile  4) Review + agreements

/login                   ← Shared login page (investor + admin)

/portal                  ← Investor-only (NextAuth protected, role: investor)
/portal/status           ← Application timeline + current stage
/portal/documents        ← Document upload (only when status = DOCUMENTS_REQUESTED)

/admin                   ← Team-only (NextAuth protected, role: admin)
/admin/investors         ← All applications, filterable by status
/admin/investors/[id]    ← Individual investor: profile, documents, status controls
```

### Auth & Roles

- Two roles: `investor` and `admin`
- `middleware.ts` at the root reads the NextAuth JWT and enforces:
  - `/portal/*` → requires `investor` or `admin` session
  - `/admin/*` → requires `admin` session only
  - Unauthenticated users → redirected to `/login`
- Investor accounts are created at the end of Phase 1 onboarding
- Admin accounts are seeded manually via a CLI seed script — no public admin registration endpoint exists

### Existing Routes (unchanged)

`/`, `/about`, `/deals`, `/contact`, `/privacy`, `/terms`

`/register` → **301 Moved Permanently** to `/onboarding`

---

## 2. Database Schema

Prisma schema targeting SQL Server (`sqlserver` provider).

### `users`
| Field | Type | Notes |
|---|---|---|
| id | String (cuid, PK) | |
| email | String (unique) | |
| passwordHash | String | bcrypt, 12 rounds |
| role | Enum: `investor` \| `admin` | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### `investor_profiles` (1-to-1 with users)
| Field | Type | Notes |
|---|---|---|
| id | String (cuid, PK) | |
| userId | String (FK → users) | unique |
| firstName | String | |
| lastName | String | |
| phone | String | |
| addressLine1 | String | |
| city | String | |
| postcode | String | |
| budgetMin | Decimal | GBP |
| budgetMax | Decimal | GBP |
| strategy | Enum: `BTL` \| `HMO` \| `Flip` \| `Any` | |
| buyerType | Enum: `cash` \| `mortgage` | |
| targetAreas | String | Comma-separated |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### `applications` (1-to-1 with investor_profiles)
| Field | Type | Notes |
|---|---|---|
| id | String (cuid, PK) | |
| investorProfileId | String (FK, unique) | |
| status | Enum (see below) | |
| adminNotes | String? | Internal only, never shown to investor |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Status enum:**
```
SUBMITTED → UNDER_REVIEW → DOCUMENTS_REQUESTED → DOCUMENTS_RECEIVED
→ KYC_APPROVED → ACTIVE_INVESTOR → DEAL_SENT
```

### `documents` (many-to-1 with applications)
| Field | Type | Notes |
|---|---|---|
| id | String (cuid, PK) | |
| applicationId | String (FK) | |
| type | Enum: `PASSPORT` \| `DRIVING_LICENCE` \| `PROOF_OF_ADDRESS` \| `SOURCE_OF_FUNDS` \| `OTHER` | |
| fileName | String | Original filename |
| blobPath | String | Azure Blob Storage path (not a public URL) |
| uploadedAt | DateTime | |
| reviewStatus | Enum: `PENDING` \| `APPROVED` \| `REJECTED` | default: PENDING |

### `status_history` (append-only audit log)
| Field | Type | Notes |
|---|---|---|
| id | String (cuid, PK) | |
| applicationId | String (FK) | |
| fromStatus | String | |
| toStatus | String | |
| changedByUserId | String? (FK → users) | null = system transition |
| note | String? | Shown to investor in their timeline feed |
| createdAt | DateTime | |

### NextAuth system tables
`accounts`, `sessions`, `verification_tokens` — generated by NextAuth Prisma adapter.

**Design decisions:**
- `status_history` is never deleted — full audit trail required for AML compliance
- `documents.blobPath` stores the container-relative path only; pre-signed URLs are generated server-side on demand (5-minute expiry) and never persisted
- Admin users have no `investor_profile` record

---

## 3. Phase 1 — Onboarding Wizard

**URL:** `/onboarding` (4-step wizard, client component with React state)

### Step 1 — Account Setup
- Email address
- Password + confirm password
- Duplicate email check via API before proceeding to step 2
- Password minimum: 8 characters

### Step 2 — Personal Details
- First name, last name
- Phone number
- Address line 1, city, postcode

### Step 3 — Investor Profile
- Budget range: min (£) and max (£)
- Strategy: BTL / HMO / Flip / Any (radio/select)
- Buyer type: Cash / Mortgage (radio)
- Target areas: free text (e.g. "Manchester, Leeds, Sheffield")

### Step 4 — Review + Agreements
- Summary of all entered data (read-only)
- Four required checkboxes:
  1. Information is accurate and complete
  2. Agree to Terms & Conditions (links to `/terms`)
  3. Agree to Privacy Policy (links to `/privacy`)
  4. Confirm over 18 and have legal authority to purchase UK property
- **Submit Application** button

### On Submission (`POST /api/onboarding`)
1. Zod validation of full payload
2. Check email not already registered
3. Hash password (bcrypt, 12 rounds)
4. Create `users` record
5. Create `investor_profiles` record
6. Create `applications` record (status: `SUBMITTED`)
7. Write `status_history` entry
8. Send **confirmation email to investor** (Resend)
9. Send **new application alert to team** (Resend → `info@revebatir.co.uk`)
10. Return `{ success: true }` → client redirects to `/portal/status`

**Wizard state:** Held in React state only. No partial persistence. If the tab is closed mid-way, the user starts again. Acceptable for this phase.

**Validation:** Zod schemas for each step, validated client-side on Next/Prev and server-side on submit. Step 3 schema enforces `budgetMin < budgetMax` with a `.refine()` check.

---

## 4. Investor Portal

### `/portal/status` — Application Timeline

**Layout:** Vertical progress stepper with all 7 stages.

Each stage shows:
- ✅ **Completed** — stage name + completion date
- 🔵 **Current** — highlighted in gold, short description of what happens next
- ⬜ **Upcoming** — greyed out, stage name only

Below the stepper: **History feed** — every `status_history` entry listed chronologically with date + any admin note.

If `status === DOCUMENTS_REQUESTED`: prominent gold CTA button → `/portal/documents`.

**Data source:** `GET /api/portal/status` — returns application status + status_history for the authenticated investor.

---

### `/portal/documents` — Document Upload

**Access control:** If `status !== DOCUMENTS_REQUESTED`, redirect to `/portal/status`.

**Three upload slots:**
1. Proof of Identity (passport or driving licence)
2. Proof of Address (utility bill or bank statement, dated within 3 months)
3. Source of Funds (bank statement, payslip, or solicitor letter)

**Per slot behaviour:**
- Upload button → file picker (PDF/JPG/PNG, max 10 MB)
- On select → `POST /api/portal/documents` → server validates type + size → streams to Azure Blob → saves `document` record → slot shows filename + timestamp
- Uploaded files can be replaced (re-upload overwrites)

**Submit:** `Submit Documents` button appears when all 3 slots are filled.
- Sets `application.status` → `DOCUMENTS_RECEIVED`
- Writes `status_history` entry
- Sends **documents-received email to investor**
- Sends **documents-ready alert to team**
- Redirects to `/portal/status`

**File upload API (`POST /api/portal/documents`):**
1. Authenticate request (NextAuth session, investor role)
2. Validate: file type (PDF/image), size ≤ 10 MB
3. Generate unique blob path: `kyc/{applicationId}/{documentType}/{uuid}.{ext}`
4. Stream to Azure Blob (private container)
5. Upsert `documents` record (replace if same type already exists)
6. Return `{ success: true, fileName }`

---

## 5. Operations Dashboard

### `/admin/investors` — Application List

**Table columns:** Name · Email · Strategy · Budget range · Status (pill) · Submitted date · Last updated

**Controls:**
- Filter by status (All + each of the 7 stages)
- Filter by strategy (BTL / HMO / Flip / Any)
- Filter by buyer type (Cash / Mortgage)
- Search by name or email (client-side filter on loaded data)

**Status pill colours:**
- Grey: `SUBMITTED`
- Blue: `UNDER_REVIEW`
- Amber: `DOCUMENTS_REQUESTED` / `DOCUMENTS_RECEIVED`
- Gold: `KYC_APPROVED` / `ACTIVE_INVESTOR`
- Green: `DEAL_SENT`

Each row → links to `/admin/investors/[id]`

**Data source:** `GET /api/admin/investors` — returns all applications with joined profile data, ordered by `updatedAt DESC`.

---

### `/admin/investors/[id]` — Investor Detail

**Three-panel layout:**

**Left panel — Investor Profile (read-only)**
All personal and criteria fields displayed. Not editable — investor owns their data.

**Centre panel — Documents**
Each uploaded document listed: type, filename, upload date, review status.
- **View** button → `GET /api/admin/documents/[id]/url` → generates 5-minute pre-signed Azure Blob URL → opens in new tab
- No permanent public links ever generated

**Right panel — Status & Actions**
- Current status displayed prominently
- **Change Status** dropdown (only allows valid forward transitions by default; admin can override to any status)
- **Note to investor** text field (optional — shown in investor's history feed)
- **Internal notes** text area (private, never shown to investor) → updates `application.adminNotes`
- **Update Status** button → `POST /api/admin/investors/[id]/status`

**Status update API (`POST /api/admin/investors/[id]/status`):**
1. Authenticate (admin role)
2. Validate new status is a permitted transition
3. Update `application.status`
4. Write `status_history` record (with `changedByUserId` + optional note)
5. Trigger status notification email to investor (Resend)
6. Return updated application

**Admin account creation:** No UI. Admins added via `npm run seed:admin -- --email admin@revebatir.co.uk --password [pw]` CLI script that writes directly to the `users` table.

---

## 6. Email Notifications

All emails sent via Resend from `noreply@revebatir.co.uk`. Styled with React Email matching the site's obsidian/gold aesthetic.

### Investor Emails (triggered by status change)

| Status | Subject | Key content |
|---|---|---|
| `SUBMITTED` | Application received — Rêve Bâtir Realty | Confirms submission; team reviews within 48h |
| `UNDER_REVIEW` | Your application is under review | Team reviewing profile |
| `DOCUMENTS_REQUESTED` | Action required: please upload your documents | CTA to `/portal/documents`; list of required docs |
| `DOCUMENTS_RECEIVED` | Documents received — KYC review in progress | Confirms receipt; timeline for review |
| `KYC_APPROVED` | KYC approved — welcome to Rêve Bâtir Realty | Congratulations; what happens next |
| `ACTIVE_INVESTOR` | You're now an active investor | Profile is live; deals sent when matched |
| `DEAL_SENT` | A deal has been matched to your criteria | Deal alert; check portal |

All emails include the admin note (if any) as a styled blockquote.

### Team Emails (to `info@revebatir.co.uk`)

| Trigger | Subject |
|---|---|
| Phase 1 submitted | New investor application — [First] [Last] |
| Documents received | Documents ready for review — [First] [Last] + link to `/admin/investors/[id]` |

### Error handling
Resend failures are logged to console but do **not** roll back the status change. Status is always committed first. The admin detail page will include a **Resend notification** button for manual retry.

---

## 7. Out of Scope (Next Sprint)

- Deal pack assignment through the portal
- Investor ability to update their own profile
- Multiple admin users with different permission levels
- SMS notifications
- Two-factor authentication
- Automated document verification (third-party KYC API e.g. Onfido)

---

## 8. Security & Compliance Notes

- All passwords hashed with bcrypt (12 rounds) — never stored in plain text
- KYC documents stored in a **private** Azure Blob container — no public access
- Pre-signed document URLs expire after 5 minutes
- `status_history` is append-only — supports AML audit trail requirement
- `/admin/*` routes are role-gated at both middleware and API route level (defence in depth)
- Personal data handling in line with the Privacy Policy (ICO registration 00014027391)
- No document data is sent via email — only notifications with portal links
