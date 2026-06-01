---
title: Admin Lead UI — brand retheme (obsidian/ivory/gold)
date: 2026-06-01
language: tsx
status: shipped
tags: [ui, admin, leads, branding, tailwind]
---

# Admin Lead UI — brand retheme

Lead admin pages shipped with default Tailwind stone-300/stone-900 styling on the
`bg-obsidian` admin canvas — looked harsh (stark-white inputs, near-black
buttons). Retheme to match the existing brand convention used by
`AdminPostDealForm` and `DealSourcePicker`.

## Existing convention (discovered in `AdminPostDealForm.tsx`)

```ts
const FIELD = 'w-full bg-carbon border border-carbon px-4 py-3 font-sans text-sm text-ivory placeholder-stone/40 focus:outline-none focus:border-gold transition-colors'
const LABEL = 'block font-sans text-[0.6rem] uppercase tracking-widest text-stone mb-2'
```

Brand tokens (from `tailwind.config.ts`):
- `obsidian` `#141414` — admin canvas
- `carbon` `#2a2a2a` — form-field surface
- `ivory` `#f0e8d8` — primary text
- `stone` `#b3b3b3` — secondary text
- `gold` `#c9a84c` / `gold-light` `#e8c96b` — accents

## Files retheme'd

1. `src/components/admin/LeadForm.tsx` — inputs to `bg-carbon`, labels to
   uppercase-tracked stone, fieldsets to `border-white/10 bg-white/[0.02]`,
   submit to `bg-gold text-obsidian`.
2. `src/components/admin/LeadNoteThread.tsx` — textarea + list to brand palette;
   submit button gold.
3. `src/components/admin/ConvertLeadButton.tsx` — primary button gold;
   success banner `border-emerald-400/40 bg-emerald-500/10 text-emerald-200`;
   error text `text-rose-300`.
4. `src/app/admin/leads/page.tsx` — heading `text-ivory`, Create-lead gold,
   status nav `text-ivory underline decoration-gold` active / `text-stone hover:text-ivory`
   inactive, rows `border-white/10 hover:bg-white/[0.04]`, name link
   `text-gold-light`.
5. `src/app/admin/leads/new/page.tsx` — heading `text-ivory`.
6. `src/app/admin/leads/[id]/page.tsx` — headings + back-link to brand tones.

`DealSourcePicker.tsx` was already on-brand — left untouched.

## Verification

- `npx vitest run` — 81 files / 718 tests pass (colour change, no behavioural impact).
- `npm run build` — clean.

📁 Save this note to: obsidian/Snippets/2026-06-01-admin-lead-ui-brand-retheme.md
