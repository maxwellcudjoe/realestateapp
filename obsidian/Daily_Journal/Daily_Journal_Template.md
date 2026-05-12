---
title: "Journal: <% tp.date.now("YYYY-MM-DD") %>"
date: <% tp.date.now("YYYY-MM-DD") %>
day_of_week: <% tp.date.now("dddd") %>
week: <% tp.date.now("WW") %>
mood: <% tp.system.prompt("How are you feeling today? (Focused | Scattered | Tired | Energized | Frustrated | Flow State)") %>
focus: <% tp.system.prompt("Main focus for today (one line)") %>
tags:
  - journal
  - <% tp.date.now("YYYY") %>
  - week-<% tp.date.now("WW") %>
---

# 📅 <% tp.date.now("dddd, MMMM Do YYYY") %>

> **Mood:** <% tp.system.prompt("Mood (Focused | Scattered | Tired | Energized | Frustrated | Flow State)") %> | **Week:** W<% tp.date.now("WW") %>

---

## 🎯 Focus of the Day

> What is the single most important thing to accomplish today?

**Primary Focus:** <% tp.system.prompt("What is your main coding goal today?") %>

**Secondary Goals:**
- 
- 

---

## ⏱️ Coding Sessions

> Log your actual work blocks throughout the day.

| Time | Task | Duration | Outcome |
|---|---|---|---|
| <% tp.date.now("HH:mm") %> | <% tp.system.prompt("First task you're starting") %> | — | — |
| | | | |
| | | | |
| | | | |

---

## 💻 Coding Progress

> What did you actually build, fix, or learn today?

### ✅ Completed
- <% tp.system.prompt("What did you complete today? (or 'Nothing yet — just started')") %>
- 

### 🔄 In Progress
- 

### ❌ Blocked
- 

---

## 🤖 AI Interactions

> Log every significant AI session. Capture the prompt, the output quality, and what you used it for.

### Interaction 1
**Time:** <% tp.date.now("HH:mm") %>
**Task:** <% tp.system.prompt("What were you asking the AI to help with?") %>
**Prompt summary:** 
> 

**Outcome / Quality:** <% tp.system.prompt("How useful was the AI's response? (Excellent | Good | OK | Poor)") %>

**Output used:** ☐ Directly  ☐ Modified  ☐ Discarded

**Notes:**
> 

---

### Interaction 2
**Time:** 
**Task:** 
**Prompt summary:**
> 

**Outcome / Quality:** 
**Notes:**
> 

---

## 💡 Notes & Insights

> Capture any "aha" moments, concepts you understood, patterns you noticed, or things worth remembering.

- <% tp.system.prompt("Write one key insight or note from today (or 'None yet')") %>
- 
- 

---

## 🐛 Bugs Hit Today

> Quick log of bugs encountered. Create a full [[Bug_Fixes/Bug_Fix_Template|Bug Fix note]] for serious ones.

| Error | Status | Fix |
|---|---|---|
| | Open | |
| | Resolved | |

---

## 📚 What I Learned Today

> Concepts, techniques, or tools you understood better today.

1. <% tp.system.prompt("Main thing you learned today (or 'TBD')") %>
2. 
3. 

---

## 🔋 Energy & Flow

| Metric | Rating (1-5) |
|---|---|
| Focus level | |
| Productivity | |
| Code quality | |
| Claude usefulness | |
| Overall day | |

---

## 🚀 Next Steps

> What do you need to pick up tomorrow? Set yourself up for a strong start.

- [ ] <% tp.system.prompt("First task for tomorrow") %>
- [ ] 
- [ ] 

**Priority for tomorrow:** 
> 

---

## 🔗 Notes Created Today

> Link any new notes you created during this session.

- [[]]
- [[]]

---

*Journal entry: <% tp.date.now("YYYY-MM-DD HH:mm") %> | Next: [[<% tp.date.now("YYYY-MM-DD", 1) %>]]*
