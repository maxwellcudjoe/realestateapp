# 📚 Knowledge Base

> This folder stores concepts, documentation summaries, research notes, technology comparisons, and anything you want to understand deeply — not just use once.

---

## 🗂️ What Goes Here

| Note Type | Example |
|---|---|
| **Concept Explainer** | "How async/await works in Python" |
| **Technology Overview** | "PostgreSQL vs SQLite — when to use which" |
| **API Reference Summary** | "OpenAI API — key endpoints and params" |
| **Design Pattern** | "Repository Pattern in FastAPI" |
| **Protocol / Standard** | "How OAuth 2.0 Authorization Code Flow works" |
| **Tool Deep Dive** | "Git rebase vs merge — visual guide" |
| **Architecture Decision** | "Why we chose Redis over Memcached" |

---

## 📝 How to Create a Knowledge Note

1. Press `Ctrl+N` to create a new note inside this folder
2. Use the frontmatter block below as your starting point
3. Write in your own words — paraphrase, don't just copy-paste docs
4. Link to related snippets, projects, or bug fixes with `[[ ]]`
5. Tag it so Dataview can surface it later

### Starter Frontmatter

```yaml
---
title: "Concept: Your Topic Here"
date_created: {{date:YYYY-MM-DD}}
category: concept | tool | pattern | protocol | api | architecture
tags:
  - knowledge
  - your-language-or-topic-tag
source: 
---
```

---

## 🔍 Dataview Queries for This Folder

### All Knowledge Notes by Category

````markdown
```dataview
TABLE category, tags
FROM "Knowledge"
SORT file.ctime DESC
```
````

### Knowledge Notes Tagged with a Specific Language

````markdown
```dataview
LIST
FROM "Knowledge"
WHERE contains(tags, "python")
```
````

---

## 🤖 AI as a Knowledge Source

Use any AI assistant to build knowledge notes fast:

**Prompt template:**
```
Explain [CONCEPT] to me as a working developer.
Cover:
1. What it is (plain English definition)
2. Why it matters
3. A minimal code example in [LANGUAGE]
4. Common pitfalls
5. When NOT to use it
```

Paste the AI's response directly into a knowledge note. Tag it `#ai` so you know the source.

---

## 🏷️ Suggested Tags

- `#concept` — Core programming concepts
- `#tool` — Dev tools and utilities
- `#pattern` — Design patterns
- `#protocol` — Networking, auth standards
- `#api` — API documentation summaries
- `#architecture` — System design decisions
- `#python` / `#javascript` / `#sql` — Language-specific

---

## 🔗 Quick Links

- [[Projects/Project_Template|Projects]]
- [[Snippets/Snippet_Template|Snippets]]
- [[Bug_Fixes/Bug_Fix_Template|Bug Fixes]]
- [[Prompts/Prompt_Template|Prompts]]
- [[Daily_Journal/Daily_Journal_Template|Daily Journal]]

---

*Knowledge is only powerful when it's organized and searchable. Write it down.*
