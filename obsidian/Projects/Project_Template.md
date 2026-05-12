---
title: <% tp.system.prompt("Project Name") %>
date_created: <% tp.date.now("YYYY-MM-DD") %>
last_updated: <% tp.date.now("YYYY-MM-DD") %>
status: <% tp.system.prompt("Status (Planning | Active | Paused | Complete)") %>
tags:
  - project
  - <% tp.system.prompt("Primary language tag (e.g. python, javascript, typescript)") %>
---

# 📦 <% tp.system.prompt("Project Name") %>

## 🎯 Goals

> What does this project aim to achieve? Be specific about the outcome.

<% tp.system.prompt("Describe the project goals (one per line, or paragraph)") %>

---

## 🗂️ Tasks

> Track high-level milestones and granular tasks below. Use checkboxes.

### Backlog
- [ ] <% tp.system.prompt("First task") %>
- [ ] 
- [ ] 

### In Progress
- [ ] 

### Done
- [x] Project initialized

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| Language | <% tp.system.prompt("Primary language") %> |
| Framework | <% tp.system.prompt("Framework (e.g. FastAPI, React, None)") %> |
| Database | <% tp.system.prompt("Database (e.g. PostgreSQL, SQLite, None)") %> |
| Hosting | <% tp.system.prompt("Hosting (e.g. Vercel, AWS, Local)") %> |
| Repo | `<% tp.system.prompt("GitHub repo URL") %>` |

---

## 🤖 AI Prompts Used

> Log every significant AI interaction here. Include the prompt and a summary of the response.

### Prompt 1
**Date:** <% tp.date.now("YYYY-MM-DD") %>
**Prompt:**
```
<% tp.system.prompt("Paste the AI prompt you used") %>
```
**Summary of Response:**
> 

---

## 📎 Related Notes

> Link to bug fixes, snippets, or knowledge notes connected to this project.

- [[]]
- [[]]
- [[]]

---

## 📝 Dev Notes & Decisions

> Capture important architectural decisions, tradeoffs, or things to remember.

- 

---

## 🔗 External References

- [Docs]()
- [Stack Overflow thread]()
- [GitHub Issue]()

---

## 📊 Status Log

| Date | Status | Notes |
|---|---|---|
| <% tp.date.now("YYYY-MM-DD") %> | <% tp.system.prompt("Current status") %> | Project note created |

---

*Last updated: <% tp.date.now("YYYY-MM-DD HH:mm") %>*
