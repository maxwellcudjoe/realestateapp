---
title: Leads Task 6 — POST + GET /api/admin/leads
date: 2026-06-01
language: typescript
status: complete
tags: [leads, api, admin, tdd]
---

# Leads Task 6 — Admin Leads create + list

## Goal

Admin endpoints to create a lead manually (phone intake / referral) and list leads with optional status filter. TDD-first.

## Files

- `src/app/api/admin/leads/route.ts` — POST + GET
- `tests/api/admin-leads-create.test.ts` — 7 tests
- `tests/api/admin-leads-list.test.ts` — 4 tests

## Behaviour

**POST /api/admin/leads**
- Admin-only (401 / 403 gates).
- Zod validation: name 1–120, sourceChannel must be valid enum, email-or-phone required.
- Lowercases email, encodes `strategyCodes` / `targetAreaCodes` as JSON strings via `encodeCodesJson`.
- Stamps `createdByUserId = session.user.id`.
- Records `LEAD_CREATED` audit with `{ sourceChannel, name }` metadata and client IP.

**GET /api/admin/leads**
- Admin-only.
- `?status=NEW|CONTACTED|QUALIFIED|CONVERTED|DECLINED|DORMANT` — filters; unknown values silently ignored.
- Orders by `createdAt desc`, capped at 200 rows.

## Conventions followed

- Auth role check uses lowercase `'admin'`.
- Errors return `{ error: 'msg' }`; success returns `{ ok: true, ... }`.
- `recordAudit({ ... metadata: object })` — lib stringifies internally.
- Tests use `vi.hoisted` for the prismaMock to satisfy vitest's hoisting rules.

## Test result

11 passed (7 create + 4 list). Duration 1.44s.

## Commit

To follow: `feat(leads): POST/GET /api/admin/leads with validation + audit`

📁 Save this note to: obsidian/Projects/2026-06-01-leads-task-6-admin-leads-api.md
