---
title: "Bug: <% tp.system.prompt("Short bug description (e.g. TypeError on line 42)") %>"
date_logged: <% tp.date.now("YYYY-MM-DD") %>
date_resolved: 
language: <% tp.system.prompt("Language (e.g. Python, JavaScript, TypeScript, Bash)") %>
status: <% tp.system.prompt("Status (Open | Investigating | Resolved | Wont-Fix)") %>
severity: <% tp.system.prompt("Severity (Critical | High | Medium | Low)") %>
related_project: <% tp.system.prompt("Related project (or 'General')") %>
tags:
  - bug
  - <% tp.system.prompt("Language tag (e.g. python, js, typescript)") %>
  - <% tp.system.prompt("Additional tag (e.g. async, database, auth, api)") %>
---

# 🐛 Bug: <% tp.system.prompt("Short bug description") %>

## 🚨 Error Message

> Paste the exact error output — full traceback if available.

```
<% tp.system.prompt("Paste the full error message or traceback") %>
```

---

## 🗺️ Context

| Field | Value |
|---|---|
| **Project** | [[<% tp.system.prompt("Project note name") %>]] |
| **File / Module** | `<% tp.system.prompt("Affected file or module path") %>` |
| **Function / Line** | `<% tp.system.prompt("Function name or line number") %>` |
| **Language** | <% tp.system.prompt("Language") %> |
| **Environment** | <% tp.system.prompt("Environment (e.g. Local dev, Docker, Production, CI)") %> |
| **OS / Runtime** | <% tp.system.prompt("OS and runtime version (e.g. Windows 11, Python 3.11)") %> |

---

## 🔬 Root Cause Analysis

> What caused this bug? Document what you found during investigation.

<% tp.system.prompt("Describe the root cause (or 'Under investigation')") %>

---

## 🧪 Steps to Reproduce

1. <% tp.system.prompt("Step 1 to reproduce the bug") %>
2. 
3. 

**Expected behavior:**
> 

**Actual behavior:**
> 

---

## 🤖 AI Solution

> Paste the AI assistant's diagnosis and fix here. Include the prompt you used.

**Prompt used:**
```
<% tp.system.prompt("What did you ask the AI? (or 'N/A')") %>
```

**AI Response / Fix:**

<% tp.system.prompt("Paste Claude's solution summary (or 'Pending')") %>

---

## ✅ Fix Applied

> Document exactly what change resolved the issue.

```<% tp.system.prompt("Language identifier for syntax highlighting") %>
# Before (broken code)


# After (fixed code)

```

**Explanation of fix:**
> 

---

## 🔍 What I Learned

> Key takeaway so you don't hit this again.

- <% tp.system.prompt("Main lesson learned from this bug") %>
- 

---

## 🔗 Related Notes & References

- [[]]
- [Reference link]()
- [Stack Overflow]()

---

## 📊 Resolution Log

| Date | Action | By |
|---|---|---|
| <% tp.date.now("YYYY-MM-DD") %> | Bug logged | Me |
| | Investigation started | |
| | Fix applied | |
| | Marked resolved | |

---

*Status: **<% tp.system.prompt("Current status") %>** | Logged: <% tp.date.now("YYYY-MM-DD HH:mm") %>*
