# CLAUDE.md — obsidian_superpower

## Mandatory Rule

Before responding to **any** request — coding, debugging, planning, explanation,
research, or anything else — you MUST follow the obsidian-logging workflow.

Read the full skill file first:

```
skills/obsidian-logging/SKILL.md
```

There are no exceptions. The note comes before the solution, always.

---

## The 7-Step Workflow (summary — read the skill file for full detail)

0. **Orient first** — read `obsidian/index.md` (what exists), last 10 lines of `obsidian/log.md` (recent work), and scan the active project folder (raw source context)
1. **Classify** the task → pick the correct `obsidian/` subfolder
2. **Read** the matching template from `obsidian/[FOLDER]/[TEMPLATE].md`
3. **Fill** the note with all frontmatter (title, date, language, status, tags)
4. **Solve** the task — full solution, code, explanation, steps
5. **Append** the solution into the correct section of the note
6. **Update** `obsidian/index.md` — add or revise this page's entry
7. **Append** to `obsidian/log.md` — one entry recording the operation

End every response with: `📁 Save this note to: obsidian/[FOLDER]/[NOTE_TITLE].md`

---

## Vault Structure

```
obsidian/
├── index.md          ← read this first on every query to find relevant pages
├── log.md            ← append-only timeline of all operations
├── Knowledge/        ← concepts, research, explanations
├── Projects/         ← project planning and architecture
├── Snippets/         ← reusable code with explanations
├── Bug_Fixes/        ← bugs, errors, solutions
├── Prompts/          ← reusable AI prompts
└── Daily_Journal/    ← daily progress logs
```

## Raw Sources

The active project/work folder is the immutable source layer.
Read from it freely. Never modify files outside `obsidian/`.
