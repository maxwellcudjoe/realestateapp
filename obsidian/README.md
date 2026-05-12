# 🧠 Obsidian Superpower — Claude-Integrated Knowledge Base

> A production-grade, Claude-powered knowledge system for developers. Log bugs, curate reusable snippets, document projects, run a daily coding journal, and build a searchable second brain — all synced with GitHub and powered by the `obsidian_superpower` skill.

---

## 🔌 Skill Integration

This vault is driven by the **`obsidian_superpower`** skill defined in [`obsidian_skill.yaml`](../obsidian_skill.yaml) at the repo root.

Claude loads this skill to:
- Auto-select the right template based on your trigger (bug, snippet, project, journal, prompt)
- Pre-fill frontmatter and structured fields from your input
- Generate full note content — diagnoses, code, decisions, summaries
- Log every Claude interaction back into the vault for future reference

---

## 🚀 Install & Use — One Command, Universal Access

### Install the Skill
Tell Claude once per session:
```
Install skill from https://github.com/maxwellcudjoe/maxsidian/tree/master/obsidian
```
Claude will load `obsidian_skill.yaml`, internalize the vault structure, templates, workflow, and tagging convention — then it's ready to use across any coding project.

### Call the Skill by Name

| What you want | Say to Claude |
|---|---|
| Log a bug | `Claude, use obsidian_superpower to log this bug: [ERROR]` |
| Save a snippet | `Claude, use obsidian_superpower to generate a snippet and save it in Snippets.` |
| Document a project | `Claude, use obsidian_superpower to create a project note for [PROJECT NAME].` |
| Write today's journal | `Claude, use obsidian_superpower to summarize today's progress in Daily_Journal.` |
| Save a prompt | `Claude, use obsidian_superpower to store this prompt in the Prompts library.` |
| Add a knowledge note | `Claude, use obsidian_superpower to write a knowledge note explaining [CONCEPT].` |

### What Claude Does After Each Call
1. Selects the right template from the vault
2. Fills all frontmatter and content fields from your input
3. Returns the complete note, ready to paste into Obsidian
4. Obsidian Git auto-commits and pushes to this repo within 30 minutes

**To activate the skill manually**, reference the YAML directly:
```
Load the obsidian_superpower skill from obsidian_skill.yaml and help me log a bug.
```

---

## 📁 Vault Structure

```
obsidian/
├── README.md                        ← You are here
├── Projects/
│   └── Project_Template.md          ← One note per project
├── Snippets/
│   └── Snippet_Template.md          ← Reusable code blocks
├── Bug_Fixes/
│   └── Bug_Fix_Template.md          ← Error → solution log
├── Knowledge/
│   └── README.md                    ← Concepts, docs, research
├── Prompts/
│   └── Prompt_Template.md           ← Claude prompt library
└── Daily_Journal/
    └── Daily_Journal_Template.md    ← Daily coding log
```

---

## � Template Descriptions

| Template | Folder | Key Fields |
|---|---|---|
| **Project_Template.md** | `Projects/` | Goals, Tasks (backlog/in-progress/done), Tech Stack, Claude Prompts log, Status log |
| **Snippet_Template.md** | `Snippets/` | Function name, Language, Code block, Use case, Variations, Claude source |
| **Bug_Fix_Template.md** | `Bug_Fixes/` | Error, Context, Root cause, Steps to reproduce, Claude Solution, Fix applied, Lessons |
| **Prompt_Template.md** | `Prompts/` | Prompt text with `[PLACEHOLDERS]`, Effectiveness rating, Variations, Example interaction |
| **Daily_Journal_Template.md** | `Daily_Journal/` | Focus, Session table, Claude interactions log, Insights, Energy, Next steps |

All templates use **Obsidian Templater** syntax (`<% tp.system.prompt("...") %>`) so Claude or Templater can auto-fill fields interactively when a note is created.

---

## 🔧 How to Use with Obsidian

### 1. Install Required Plugins
Open **Settings → Community Plugins** and install:

| Plugin | Purpose |
|---|---|
| **Templater** | Auto-fills template fields using `<% ... %>` syntax |
| **Dataview** | Queries notes like a database using `dataview` code blocks |
| **Obsidian Git** | Auto-commits and pushes vault to GitHub on a schedule |
| **Calendar** | Daily journal navigation |
| **CodeMirror Options** | Enhanced code block rendering |
| **Tag Wrangler** | Manage and rename tags across vault |

### 2. Configure Templater
- Go to **Settings → Templater**
- Set **Template folder** to `obsidian/`
- Enable **Trigger Templater on new file creation**
- Enable **Enable system commands**
- Map folders to templates:

| Folder | Template |
|---|---|
| `Bug_Fixes/` | `Bug_Fix_Template.md` |
| `Projects/` | `Project_Template.md` |
| `Snippets/` | `Snippet_Template.md` |
| `Prompts/` | `Prompt_Template.md` |
| `Daily_Journal/` | `Daily_Journal_Template.md` |

### 3. Create a Note from a Template
- Press `Ctrl+P` → **"Templater: Create new note from template"**
- Select the template
- Templater prompts you to fill each field interactively

### 4. Graph View — See Your Knowledge Network
- Press `Ctrl+G` to open Graph View
- Enable **Tags** and **Attachments** in the filter panel
- Color-code by tag: `#bug` → red, `#project` → blue, `#snippet` → green
- Watch connections form between bugs, projects, snippets, and prompts

---

## 🤖 AI Integration — Skill-Powered Workflow

Any AI assistant (GitHub Copilot, Claude, GPT-4, Gemini) acts as your **pair programmer, knowledge curator, and reasoning engine** inside this vault. The `obsidian_superpower` skill defines the exact 5-step workflow:

### The Workflow

```
Trigger (bug / snippet / project / journal / prompt)
  │
  ▼
Step 1 — Retrieve Context
  Claude reads existing vault notes to avoid duplicating solved problems
  │
  ▼
Step 2 — Identify Template
  Claude maps the trigger to the right folder and template
  │
  ▼
Step 3 — Generate or Refine
  Claude produces the full note: diagnosis, code, explanation, next steps
  │
  ▼
Step 4 — Save Back to Vault
  Note saved → Obsidian Git auto-commits → GitHub updated
  │
  ▼
Step 5 — Visualize & Query
  Dataview surfaces the note in live dashboards and tables
```

### Starting an AI Session with This Skill

```
Load the obsidian_superpower skill from obsidian_skill.yaml.
I hit a bug in my Python FastAPI project — here's the traceback: [ERROR]
```

```
Load the obsidian_superpower skill.
Generate a reusable snippet for parsing environment variables in Node.js.
```

```
Load the obsidian_superpower skill.
Write my daily journal entry. Today I worked on: [SUMMARY]
```

### AI Field in Every Template
Every template includes an **AI Solution**, **AI Prompts**, or **AI Interactions** field. Paste the AI's exact response there — this creates a searchable, version-controlled history of every AI-assisted decision.

---

## 🔄 GitHub Sync — Version Control Your Knowledge

### Initial Setup (already done for this repo)
```bash
git init
git remote add origin https://github.com/maxwellcudjoe/maxsidian.git
git add .
git commit -m "init: obsidian knowledge base"
git push -u origin master
```

### Daily Sync (manual)
```bash
git add .
git commit -m "journal: $(date +%Y-%m-%d) daily notes"
git push
```

### Automatic Sync via Obsidian Git Plugin
1. Install **Obsidian Git** from Community Plugins
2. Go to **Settings → Obsidian Git**
3. Set **Auto-commit interval**: `30` minutes
4. Set **Commit message**: `vault backup: {{date}}`
5. Enable **Auto push after commit**

### Recommended `.gitignore`
```gitignore
.obsidian/workspace.json
.obsidian/workspace-mobile.json
.trash/
*.canvas
```

---

## 🔍 Querying Notes with Dataview

Dataview turns your vault into a live database. Paste these blocks into any Obsidian note and switch to Reading View.

### All Open Bugs
````markdown
```dataview
TABLE error, language, status
FROM "Bug_Fixes"
WHERE status != "Resolved"
SORT file.mtime DESC
```
````

### All Active Projects
````markdown
```dataview
TABLE goals, status
FROM "Projects"
WHERE status = "Active"
```
````

### Today's Journal Entry
````markdown
```dataview
LIST
FROM "Daily_Journal"
WHERE file.day = date(today)
```
````

### Snippets by Language
````markdown
```dataview
TABLE language, use_case
FROM "Snippets"
WHERE language = "Python"
SORT file.ctime DESC
```
````

### All Reusable Claude Prompts
````markdown
```dataview
LIST
FROM "Prompts"
WHERE contains(tags, "reusable")
```
````

### Full Knowledge Base Index
````markdown
```dataview
TABLE category, tags, file.ctime AS Created
FROM "Knowledge"
SORT file.ctime DESC
```
````

---

## ✅ Benefits

| Benefit | How |
|---|---|
| Never lose a bug fix | Every error + solution is logged, tagged, and searchable |
| Reuse Claude prompts | Prompt library means you never write the same instruction twice |
| Track project progress | Structured notes with status fields surfaced by Dataview |
| Build a knowledge base | Concepts grow with every coding session |
| Version-controlled brain | GitHub sync = full history of every note ever written |
| See hidden connections | Graph view links bugs → projects → snippets → prompts |
| Skill-powered automation | `obsidian_superpower` skill auto-selects templates and fills fields |

---

## 🏷️ Tagging Convention

Use consistent tags across all notes for powerful Dataview filtering:

| Tag | Usage |
|---|---|
| `#bug` | Bug fix notes |
| `#snippet` | Code snippets |
| `#project` | Project notes |
| `#journal` | Daily journal entries |
| `#prompt` | Claude prompts |
| `#knowledge` | Concept / research notes |
| `#ai` | AI-assisted content |
| `#resolved` | Closed bugs / completed tasks |
| `#active` | In-progress work |
| `#python` / `#js` / `#ts` | Language-specific |
| `#reusable` | Prompts or snippets worth reusing |
| `#review` | Notes that need follow-up |
| `#verified` | Tested and confirmed correct |

---

## 📌 Quick Reference

| Action | Shortcut / Command |
|---|---|
| New note from template | `Ctrl+P` → Templater: Create new note |
| Open daily journal | `Ctrl+P` → Calendar: Open today |
| Search vault | `Ctrl+Shift+F` |
| Graph view | `Ctrl+G` |
| Toggle Dataview block | Render in Reading View |
| Git push (manual) | `git add . ; git commit -m "msg" ; git push` |

---

*Built for developers. Powered by [`obsidian_superpower`](../obsidian_skill.yaml). Synced with [GitHub](https://github.com/maxwellcudjoe/maxsidian).*
