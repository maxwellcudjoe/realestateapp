---
title: "Investor Platform Expansion — Onboarding, Operations Dashboard & Status Tracking"
date_created: 2026-05-12
last_updated: 2026-05-12
status: Planning
tags:
  - project
  - typescript
---

# 📦 Investor Platform Expansion

## 🎯 Goals

> Transform the Rêve Bâtir Realty marketing site into a full investment platform.

1. **KYC/AML-Compliant Investor Onboarding** — multi-step onboarding flow (personal details → ID upload → source of funds → investment criteria → signed agreements), backed by actual process to match HMRC AML and ICO compliance claims.
2. **Operations Dashboard** — internal admin area where the Rêve Bâtir team reviews submissions, requests additional documents, updates applicant status, and assigns deal packs.
3. **Status Tracking & Notifications** — investors receive email updates at every stage change (submitted → under review → documents requested → approved → deal sent).

---

## 🗂️ Tasks

### Backlog
- [ ] Brainstorm architecture, auth strategy, database choice, and compliance flow
- [ ] Write detailed implementation plan
- [ ] Build multi-step onboarding wizard (client-facing)
- [ ] Build operations/admin dashboard (internal)
- [ ] Build status-update notification system (Resend emails)
- [ ] Fill compliance placeholders in Privacy Policy & Terms

### In Progress
- [ ] Brainstorming session

### Done
- [x] Marketing site v1 live at revebatir.co.uk
- [x] Register form + contact form with Zod validation + Resend email
- [x] CMS-driven deal listings (Contentful)
- [x] Multi-photo gallery on deal cards
- [x] UK GDPR Privacy Policy + Terms & Conditions pages

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Framework | Next.js 14 (App Router) |
| Database | TBD — Supabase / PlanetScale / Azure Cosmos |
| Auth | TBD — NextAuth / Clerk / Supabase Auth |
| Email | Resend (already integrated) |
| CMS | Contentful (deals only) |
| Hosting | Azure Static Web Apps (auto-deploy from GitHub) |
| Repo | `github.com/[user]/RealEstateWebSite` |

---

## 🤖 AI Prompts Used

### Prompt 1
**Date:** 2026-05-12
**Prompt:**
```
Study the code base and produce this website where customers aside from just visiting
can have full onboarding if they are interested, complying with all the claims the
website purposes to be compliant with. This should also have an operations side where
we work on these requests and customer gets updated at each status.
```
**Summary of Response:**
> Launching brainstorming skill to design the full architecture before writing any code. Key questions: what stages does onboarding have, how is auth handled, where is data stored, what does the ops dashboard show, how are status notifications sent.

---

## 📎 Related Notes

- [[2026-05-11-realestate-codebase-understanding]]

---

## 📝 Dev Notes & Decisions

- Existing site: Next.js 14, Tailwind (obsidian/gold/ivory tokens), Contentful CMS, Resend email, Azure SWA hosting
- Must stay compliant with: HMRC AML supervision, ICO data controller registration 00014027391, FCA non-regulated disclaimer
- Contentful is NOT a database — investor application state needs a proper DB
- The `/register` page currently only captures buyer criteria and sends a Resend email — no persistence

---

## 🔗 External References

- [HMRC AML Supervision Guidance](https://www.gov.uk/guidance/money-laundering-regulations-register-with-hmrc)
- [ICO Data Controller Registration](https://ico.org.uk/for-organisations/register/)
- [UK GDPR Article 6 lawful bases](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/)

---

## 📊 Status Log

| Date | Status | Notes |
|---|---|---|
| 2026-05-12 | Planning | Brainstorming session started |

---

*Last updated: 2026-05-12*
