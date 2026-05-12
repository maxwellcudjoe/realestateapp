# obsidian_superpower — Skills System

## The Rule

**Before responding to ANY request, check whether a skill applies and invoke it.**
Even a 1% chance a skill might apply means you MUST read and follow it.
Skills are mandatory workflows, not suggestions.

## How to Use Skills

Skills live in `skills/[skill-name]/SKILL.md`.
To invoke a skill, read its file and follow the instructions exactly:

```
read_file("skills/[skill-name]/SKILL.md")
```

Announce before invoking: `Using [skill-name] to [purpose].`

## Available Skills

| Skill | File | When to invoke |
|---|---|---|
| `obsidian-logging` | `skills/obsidian-logging/SKILL.md` | **Every task** — coding, debugging, planning, documentation, explanation, or any other request |

## Skill Priority

`obsidian-logging` applies to **every** request in this repo. There are no exceptions.
Read the skill file before producing any response.

## Environment Awareness (Step 0)

Before invoking the skill workflow, always orient by reading:
1. `obsidian/index.md` — what pages already exist in the wiki
2. Last 10 entries of `obsidian/log.md` — what was done recently
3. Active project/work folder — the raw source layer (read freely, never modify)

This makes every response context-aware: the LLM knows the current state of the wiki,
recent history, and the actual codebase being worked on before it acts.

---

## Install Instruction (one command per repo)

**Windows (PowerShell):**
```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/maxwellcudjoe/maxsidian/master/setup_vault.ps1 -OutFile setup_vault.ps1; .\setup_vault.ps1
```

**Mac / Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/maxwellcudjoe/maxsidian/master/setup_vault.sh | bash
```
