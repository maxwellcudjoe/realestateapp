# setup_vault.ps1
# Obsidian Superpower — Vault Setup Script (Windows)
# Run this once in any repo to create the obsidian/ folder structure.
# Usage: .\setup_vault.ps1

$vault = "obsidian"
$folders = @("Projects", "Snippets", "Bug_Fixes", "Knowledge", "Prompts", "Daily_Journal")
$remote = "https://raw.githubusercontent.com/maxwellcudjoe/maxsidian/master/obsidian"

Write-Host ""
Write-Host "🧠 obsidian_superpower — Vault Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Create folders
foreach ($folder in $folders) {
    $path = "$vault/$folder"
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Host "  ✅ Created $path" -ForegroundColor Green
    } else {
        Write-Host "  ⏩ Already exists: $path" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "📥 Downloading templates from maxsidian..." -ForegroundColor Cyan
Write-Host ""

# Template map: folder => filename
$templates = @{
    "Projects"     = "Project_Template.md"
    "Snippets"     = "Snippet_Template.md"
    "Bug_Fixes"    = "Bug_Fix_Template.md"
    "Prompts"      = "Prompt_Template.md"
    "Daily_Journal"= "Daily_Journal_Template.md"
    "Knowledge"    = "README.md"
}

foreach ($folder in $templates.Keys) {
    $file     = $templates[$folder]
    $dest     = "$vault/$folder/$file"
    $url      = "$remote/$folder/$file"

    if (-not (Test-Path $dest)) {
        try {
            Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
            Write-Host "  ✅ Downloaded $dest" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠️  Could not download $file — create it manually from:" -ForegroundColor Red
            Write-Host "      $url" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ⏩ Template already exists: $dest" -ForegroundColor Yellow
    }
}

# Download root README
$readmeDest = "$vault/README.md"
$readmeUrl  = "$remote/README.md"
if (-not (Test-Path $readmeDest)) {
    try {
        Invoke-WebRequest -Uri $readmeUrl -OutFile $readmeDest -UseBasicParsing
        Write-Host "  ✅ Downloaded $readmeDest" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  Could not download obsidian/README.md" -ForegroundColor Red
    }
}

# Install skills/obsidian-logging/SKILL.md (obra/superpowers-style skill file)
Write-Host ""
Write-Host "🧩 Installing skills/obsidian-logging/SKILL.md..." -ForegroundColor Cyan
$skillDir  = "skills/obsidian-logging"
$skillDest = "$skillDir/SKILL.md"
$skillUrl  = "https://raw.githubusercontent.com/maxwellcudjoe/maxsidian/master/skills/obsidian-logging/SKILL.md"
if (-not (Test-Path $skillDir)) {
    New-Item -ItemType Directory -Path $skillDir -Force | Out-Null
}
if (-not (Test-Path $skillDest)) {
    try {
        Invoke-WebRequest -Uri $skillUrl -OutFile $skillDest -UseBasicParsing
        Write-Host "  ✅ Installed $skillDest" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  Could not download SKILL.md — create it manually from:" -ForegroundColor Red
        Write-Host "      $skillUrl" -ForegroundColor Gray
    }
} else {
    Write-Host "  ⏩ SKILL.md already present" -ForegroundColor Yellow
}

# Install IDE-specific instruction files so skill auto-triggers in every AI tool
Write-Host ""
Write-Host "🤖 Installing IDE instruction files..." -ForegroundColor Cyan

$baseUrl = "https://raw.githubusercontent.com/maxwellcudjoe/maxsidian/master"
$ideFiles = @(
    @{ dest = ".github/copilot-instructions.md"; dir = ".github" },
    @{ dest = "CLAUDE.md";       dir = $null },
    @{ dest = "AGENTS.md";       dir = $null },
    @{ dest = ".cursorrules";    dir = $null },
    @{ dest = ".windsurfrules";  dir = $null }
)

foreach ($f in $ideFiles) {
    if ($f.dir -and -not (Test-Path $f.dir)) {
        New-Item -ItemType Directory -Path $f.dir -Force | Out-Null
    }
    if (-not (Test-Path $f.dest)) {
        try {
            Invoke-WebRequest -Uri "$baseUrl/$($f.dest)" -OutFile $f.dest -UseBasicParsing
            Write-Host "  ✅ Installed $($f.dest)" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠️  Could not download $($f.dest)" -ForegroundColor Red
        }
    } else {
        Write-Host "  ⏩ Already present: $($f.dest)" -ForegroundColor Yellow
    }
}

# Bootstrap obsidian/index.md and obsidian/log.md
Write-Host ""
Write-Host "🗂️  Bootstrapping index.md and log.md..." -ForegroundColor Cyan
$today = Get-Date -Format "yyyy-MM-dd"

$indexDest = "$vault/index.md"
if (-not (Test-Path $indexDest)) {
    @"
---
title: "Wiki Index"
date: "$today"
tags: [index, meta]
---

# Wiki Index

Master catalog of all pages in this vault.
The LLM reads this first on every query to locate relevant pages before drilling in.
Updated automatically on every ingest, query result saved, or new note created.

> **Raw Sources:** The active project/work folder is the immutable source layer. The LLM reads from it but never modifies it.

---

## 📚 Knowledge

| Page | Summary |
|---|---|

## 🗂️ Projects

| Page | Summary |
|---|---|

## 🐛 Bug Fixes

| Page | Summary |
|---|---|

## 💻 Snippets

| Page | Summary |
|---|---|

## 💬 Prompts

| Page | Summary |
|---|---|

## 📓 Daily Journal

| Page | Summary |
|---|---|
"@ | Set-Content $indexDest
    Write-Host "  ✅ Created $indexDest" -ForegroundColor Green
} else {
    Write-Host "  ⏩ Already exists: $indexDest" -ForegroundColor Yellow
}

$logDest = "$vault/log.md"
if (-not (Test-Path $logDest)) {
    @"
# Wiki Log

Append-only chronological record of all operations performed on this vault.
Each entry format: ``## [YYYY-MM-DD] <operation> | <title>``

Operations: ``ingest`` · ``query`` · ``lint`` · ``setup``

---

## [$today] setup | Vault bootstrapped

- Created obsidian/ folder structure and templates
- Installed IDE instruction files (copilot-instructions.md, CLAUDE.md, AGENTS.md, .cursorrules, .windsurfrules)
- Created obsidian/index.md and obsidian/log.md
"@ | Set-Content $logDest
    Write-Host "  ✅ Created $logDest" -ForegroundColor Green
} else {
    Write-Host "  ⏩ Already exists: $logDest" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📄 Adding obsidian/ to .gitignore exceptions..." -ForegroundColor Cyan
$gitignorePath = ".gitignore"
$ignoreEntries = @(
    "",
    "# Obsidian vault",
    ".obsidian/workspace.json",
    ".obsidian/workspace-mobile.json",
    ".trash/",
    "*.canvas"
)
foreach ($entry in $ignoreEntries) {
    $existing = Get-Content $gitignorePath -ErrorAction SilentlyContinue
    if (-not ($existing -contains $entry)) {
        Add-Content $gitignorePath $entry
    }
}
Write-Host "  ✅ .gitignore updated" -ForegroundColor Green

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✅ Vault setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Open this repo folder as your Obsidian vault" -ForegroundColor Gray
Write-Host "  2. Install Obsidian plugins: Templater, Dataview, Calendar" -ForegroundColor Gray
Write-Host "  3. The LLM will auto-invoke obsidian_superpower on every task:" -ForegroundColor Gray
Write-Host "     VS Code       -> .github/copilot-instructions.md" -ForegroundColor Gray
Write-Host "     Claude Code   -> CLAUDE.md" -ForegroundColor Gray
Write-Host "     Codex/ChatGPT -> AGENTS.md" -ForegroundColor Gray
Write-Host "     Cursor        -> .cursorrules" -ForegroundColor Gray
Write-Host "     Windsurf      -> .windsurfrules" -ForegroundColor Gray
Write-Host ""
