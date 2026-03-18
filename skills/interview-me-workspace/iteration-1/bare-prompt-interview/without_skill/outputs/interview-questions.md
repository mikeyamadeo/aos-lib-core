# Interview Questions: Dotfile Management CLI Tool

## Prompt Analysis

The user wants to build a CLI tool for managing dotfiles with three core requirements:

1. **Cross-machine syncing** -- Configs must stay in sync between a work laptop and a personal desktop. This implies some form of transport/storage layer (git, rsync, cloud, etc.) and a conflict resolution strategy.
2. **Private vs. public configs** -- Some configs contain secrets or work-specific data that should never land in a public repo. Others (shell aliases, editor settings) are safe to share. The tool needs a clear boundary between the two.
3. **Cross-platform support (macOS + Linux)** -- Path differences (`~/Library/...` vs. `~/.config/...`), package manager differences (brew vs. apt/pacman), and OS-specific config blocks all need handling.

Key unknowns that the interview should resolve:
- The sync mechanism and where the source of truth lives.
- How secrets and private data are protected.
- The granularity of "config" (whole files, blocks within files, templates).
- The user's existing workflow and pain points that motivate this tool.
- Whether this is meant for personal use only or if it should be shareable/open-source.

---

## Questions (in order)

### 1. What is your current dotfile workflow, and what specifically is breaking or painful about it?

**Why this matters:** Before designing anything, we need to understand the status quo. The user may already have a git bare repo, GNU Stow setup, or a manual copy process. Knowing what fails today tells us what the tool must fix and what patterns to avoid repeating.

---

### 2. What is the sync/transport mechanism you have in mind -- git-backed, a custom daemon, rsync, or something else?

**Why this matters:** This is the most fundamental architectural decision. A git-backed approach gives versioning and conflict detection for free but requires the user to commit/push. A daemon or file-watch approach gives real-time sync but adds complexity. The answer shapes nearly every other design choice.

---

### 3. How do you define "private" vs. "public" configs? Is it at the file level, or do you need to redact specific values within a single file (e.g., API keys inside a shell profile)?

**Why this matters:** File-level separation is straightforward (two repos, or `.gitignore` patterns). Value-level separation requires templating or secret injection, which is a significantly harder problem. The answer determines whether we need a template engine, encryption layer (like `git-crypt` or `age`), or a simple directory split.

---

### 4. When there is a conflict -- say you changed `.zshrc` on both machines before syncing -- what should happen?

**Why this matters:** Conflict resolution strategy is critical for a sync tool. Options range from "last write wins" to "show a diff and let me pick" to "never allow conflicts by locking." The user's tolerance for manual intervention vs. data loss risk directly affects the UX.

---

### 5. How do you want to handle OS-specific differences? Separate files per platform, conditional blocks within a single file, or a template system that renders per-machine?

**Why this matters:** macOS and Linux often need different paths, different package managers, and different tool versions. The approach chosen (file-per-platform, conditionals, or templates) affects the file organization, the complexity of the "apply" step, and how intuitive the tool is to maintain long-term.

---

### 6. What configs are in scope? Just dotfiles in `$HOME`, or also system-level configs, Launch Agents/systemd units, package lists, shell plugins, etc.?

**Why this matters:** Scope determines the permission model (does the tool ever need `sudo`?), the directory structure, and how much "bootstrap from scratch" capability the tool needs. A tool that only manages `~/.config` is very different from one that can fully provision a new machine.

---

### 7. Should this tool be usable by other people (open-source, team-shared), or is it purely for your personal machines?

**Why this matters:** A personal tool can make assumptions (hardcoded paths, your specific shell, your git hosting). A shared/open-source tool needs plugin points, documentation, config schemas, and a more defensive design. This affects how much abstraction we invest in up front.

---

### 8. What is your preferred language/runtime for the CLI, and are there any hard constraints on dependencies?

**Why this matters:** The implementation language affects portability (a Go or Rust binary is zero-dependency; a Python or Node tool needs a runtime), startup speed, and your ability to maintain the project. If you have a strong preference or an existing codebase to integrate with, that narrows the options immediately.
