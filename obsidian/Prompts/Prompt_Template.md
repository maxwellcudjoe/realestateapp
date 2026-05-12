---
title: <% tp.system.prompt("Prompt Name / Label (e.g. 'Debug Python Traceback')") %>
date_created: <% tp.date.now("YYYY-MM-DD") %>
category: <% tp.system.prompt("Category (debug | refactor | explain | generate | review | optimize | test)") %>
language: <% tp.system.prompt("Target language (e.g. Python, JavaScript, Any)") %>
reusable: <% tp.system.prompt("Is this reusable? (yes / no)") %>
effectiveness: <% tp.system.prompt("Effectiveness rating 1-5 (or 'Untested')") %>
tags:
  - prompt
  - claude
  - <% tp.system.prompt("Category tag (e.g. debug, refactor, explain)") %>
  - <% tp.system.prompt("Language tag") %>
---

# 🧠 Prompt: <% tp.system.prompt("Prompt Name / Label") %>

## 📋 Metadata

| Field | Value |
|---|---|
| **Category** | <% tp.system.prompt("Category") %> |
| **Target Language** | <% tp.system.prompt("Language") %> |
| **Reusable** | <% tp.system.prompt("yes / no") %> |
| **Effectiveness** | ⭐ <% tp.system.prompt("Rating 1-5") %> / 5 |
| **Model Used** | <% tp.system.prompt("Model (e.g. Claude Sonnet, GPT-4o, Copilot, Gemini)") %> |

---

## 📝 The Prompt

> Copy-paste this prompt directly into Claude, filling in the `[PLACEHOLDERS]`.

```
<% tp.system.prompt("Paste the full reusable prompt here. Use [BRACKETS] for variable parts.") %>
```

---

## 🔧 Placeholders Guide

| Placeholder | What to Replace With |
|---|---|
| `[LANGUAGE]` | The programming language (e.g. Python, TypeScript) |
| `[CODE]` | Your code block |
| `[ERROR]` | The full error message or traceback |
| `[CONCEPT]` | The topic or concept name |
| `[CONTEXT]` | Brief description of what you're building |

> Edit this table to match the placeholders in your specific prompt.

---

## 💬 Example Interaction

**Input (filled prompt):**
```
<% tp.system.prompt("Show a filled example of the prompt in use (or type 'Pending')") %>
```

**Claude's Output Summary:**
> <% tp.system.prompt("Summarize what Claude produced (or type 'Pending')") %>

---

## 📊 Prompt Variations

> Tweaked versions of this prompt for different situations.

### Variation 1 — <% tp.system.prompt("Name for variation 1 (e.g. 'For TypeScript')") %>
```
# Paste variation here
```

### Variation 2
```
# Paste variation here
```

---

## 🧪 When to Use This Prompt

> Describe the exact situation where this prompt shines.

<% tp.system.prompt("Describe when to use this prompt") %>

---

## ⚠️ Limitations

> What does this prompt NOT handle well?

- <% tp.system.prompt("Known limitation or edge case (or 'None observed yet')") %>
- 

---

## 🔗 Related Notes

- [[]]
- [[]]

---

*Prompt logged: <% tp.date.now("YYYY-MM-DD HH:mm") %> | Effectiveness: <% tp.system.prompt("Rating") %>/5*
