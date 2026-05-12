---
name: obsidian-logging
description: "Log every AI task to an Obsidian vault note. MUST run before any task — coding, debugging, planning, documentation, or any other request. Classifies the task, fills the matching template, solves it, appends the solution, and reminds user to save the note."
---

# Obsidian Logging

Before solving any task, create a filled Obsidian vault note, solve the task, append
the solution into the note, and remind the user to save it.

<HARD-GATE>
Do NOT produce any solution output until you have first produced the complete filled
Obsidian note template for the task. The note comes first, always.
</HARD-GATE>

## Step 0 — Orient (Environment Awareness)

Before doing anything else, read these two files to understand the current state:

1. **`obsidian/index.md`** — what pages already exist in the wiki. If a relevant page
   exists, update it rather than creating a duplicate.
2. **`obsidian/log.md`** (last 10 entries) — what was done recently. Avoid repeating
   work already logged. Use recent context to inform how you frame the new note.
3. **Scan the active project/work folder** — note what files, languages, and structure
   are present. This is the raw source layer. Use it to make notes concrete and specific
   to the actual codebase or content being worked on.

Only after reading these three sources should you proceed to Step 1.

## Step 1 — Classify the Task

| Task type | Vault folder | Template file |
|---|---|---|
| Bug / error / traceback / crash | `obsidian/Bug_Fixes/` | `Bug_Fix_Template.md` |
| Code snippet / function / utility | `obsidian/Snippets/` | `Snippet_Template.md` |
| Project / feature / planning / architecture | `obsidian/Projects/` | `Project_Template.md` |
| Daily progress / summary / journal | `obsidian/Daily_Journal/` | `Daily_Journal_Template.md` |
| Reusable AI prompt / instruction | `obsidian/Prompts/` | `Prompt_Template.md` |
| Concept / research / explanation / docs | `obsidian/Knowledge/` | *(free-form note)* |

## Step 2 — Fill the Template

Read the matching template from `obsidian/[FOLDER]/[TEMPLATE].md`, then produce a
completely filled note. Include all frontmatter fields:

```yaml
---
title: "<descriptive title>"
date: "<YYYY-MM-DD>"
language: "<programming language or 'general'>"
status: "in-progress"
tags: [<relevant>, <tags>]
---
```

Include every section header from the template, even if some are blank placeholders.

## Step 3 — Solve the Task

Provide the full solution: code, diagnosis, explanation, steps — whatever the task
requires. Be thorough.

## Step 4 — Append AI Output to the Note

Paste your solution into the correct section of the note:

| Note type | Target section |
|---|---|
| Bug fix | `## 🤖 AI Solution` |
| Snippet | `## 💻 Code` and `## 🔍 How It Works` |
| Project | `## 🤖 AI Prompts Used` |
| Daily journal | `## 🤖 AI Interactions` |
| Prompt | `## 💬 Example Interaction` |
| Knowledge | main body of the note |

## Step 5 — Update index.md

After creating or updating a note, add or update its entry in `obsidian/index.md`
under the correct category section. Format:

```
| [[Note_Title]] | One-line summary of what this page covers |
```

If the page already exists in the index, update its summary if the content changed.

## Step 6 — Append to log.md

Append a new entry to `obsidian/log.md`. Format:

```
## [YYYY-MM-DD] <operation> | <title>

- Created / Updated: `obsidian/[FOLDER]/[NOTE_TITLE].md`
- Key points: <one or two bullet points about what was done>
- Source: [[linked pages if any]]
```

Operation types: `ingest` (new source processed) · `query` (answer filed as page) · `lint` (health check) · `setup` (meta/config changes)

## Step 7 — Remind to Save

End **every** response with exactly:

```
📁 Save this note to: obsidian/[FOLDER]/[NOTE_TITLE].md
```

## Vault Structure Reference

```
obsidian/
├── index.md                        ← master catalog (LLM reads first on every query)
├── log.md                          ← append-only operation timeline
├── Bug_Fixes/Bug_Fix_Template.md
├── Snippets/Snippet_Template.md
├── Projects/Project_Template.md
├── Daily_Journal/Daily_Journal_Template.md
├── Prompts/Prompt_Template.md
└── Knowledge/README.md
```

## Raw Sources

The active **project/work folder** (wherever you are currently working) is the
immutable raw sources layer. The LLM reads files from it as source material but
**never modifies them**. The `obsidian/` vault is the compiled knowledge layer built on top.

## Key Principles

- **Note first, solution second** — never skip the note generation step
- **Always fill all frontmatter** — title, date, language, status, tags
- **Always update index.md** — add or revise the entry for the note
- **Always append to log.md** — one entry per task, append-only
- **Always end with the save reminder** — every single response, no exceptions
- **Note title = descriptive slug** — e.g. `fix-null-pointer-login-handler` not `bug`
