---
name: meta-cli
description: >-
  Use this skill when the user wants to build a CLI-backed connector skill that wraps an
  external API — e.g., "build a skill for the Acme CRM API", "wrap the solar sales platform
  as a skill", "turn this REST API into a skill", "make a CLI for the bespoke CRM", "I need
  a connector skill for X". Scaffolds the full slack/hubspot/quo-style structure: SKILL.md
  router, cookbook/ files, references/, and a working CLI (bash or bun/TypeScript) that
  already satisfies the contract — JSON on stdout, JSON errors on stderr, exit codes 0/1/2/3,
  `{data, paging}` list envelopes, and the JSONL `meta → records → summary` batch envelope.
  Use whenever the user has an API (internal, vendor, bespoke CRM, data platform) and wants
  to expose it through a skill so Claude and orchestrators can query it consistently.
  EXCLUDE: generic flat/cookbook skills with no CLI (use meta-skill), iterating on an existing
  skill's content (use skill-creator), wrapping things that already have a first-class CLI
  (e.g., `gh`, `stripe`) — those usually just need a thin skill, not a new CLI.
argument-hint: "scaffold|add-batch [api name or brief]"
---

# Meta-CLI — Scaffold CLI Connector Skills

Creates skills that wrap an external API behind a CLI, following the battle-tested pattern used by `slack`, `hubspot`, and `quo`. Every generated skill gets a router `SKILL.md`, per-command `cookbook/` files, `references/` (setup + contract), and a working CLI (bash or bun/TypeScript) that honors the contract and runs end-to-end against the real API whenever the scaffolder has enough information to write the real calls.

## Commands

| Command | Purpose | Output |
|---------|---------|--------|
| `scaffold` | Interview the user about the API, pick a runtime, generate the full skill directory with a working CLI | Directory tree + files |
| `add-batch` | Add `fetch-*` JSONL batch commands to an existing CLI connector skill | Edits to CLI + new cookbook file |

## Cookbook

| Command | File | Use When |
|---------|------|----------|
| `scaffold` | `cookbook/scaffold.md` | User wants a brand-new connector skill for some API |
| `add-batch` | `cookbook/add-batch.md` | An existing CLI skill needs batch extraction (`fetch-*`) added |

Read the matching cookbook file first, then execute the steps.

## Reference Loading

- **Tier 1 (always, before any scaffolding):** `references/cli-contract.md`, `references/runtime-decision.md`
- **Tier 2 (after runtime chosen):** `references/bun-template.md` **or** `references/bash-template.md`
- **Tier 3 (only if applicable):** `references/batch-envelope.md` (when adding `fetch-*`), `references/safety-template.md` (when any command mutates)

## The Pattern — Why it Exists

The `slack`/`hubspot`/`quo` skills all share a shape because the shape works:

- **Agents compose CLIs.** A consistent output contract (JSON stdout, JSON errors on stderr, exit codes 0/1/2/3) means any command can be piped into `jq`, chained in shell, or consumed by an orchestrator without parsing tricks.
- **Cookbook files are workflows, not docs.** Each cookbook file tells Claude *how to run a command in context* — when to resolve, when to confirm, what to do on 404. This is what makes the skill usable in conversation instead of just a reference manual.
- **SKILL.md is a router, not a tutorial.** It points to the cookbook file for the task at hand. Keep it scannable.
- **Primitives + batch.** `get-*` and `list-*` for interactive use; `fetch-*` for orchestrator-scale extraction. Different output shapes, different envelopes, same contract.

When you scaffold a new skill, everything you generate should serve these principles. If something in your scaffold breaks the contract (plain-text errors, novel output shapes, silent auth failures), fix it before handing off.

## Quick Contract Reminder (full spec in `references/cli-contract.md`)

- stdout: JSON or JSONL — data only, never logs
- stderr: JSON for fatal errors `{"error": "...", "code": N}`; plain text for warnings/progress
- exit codes: `0` ok, `1` unexpected, `2` input validation, `3` auth/API
- list envelope: `{data: [...], paging?: {next: {after: "cursor"}}}`
- batch envelope: `meta → records → summary` (contract-v1 JSONL)
- auth: one env var, read from workspace `.env`, validated on first call
