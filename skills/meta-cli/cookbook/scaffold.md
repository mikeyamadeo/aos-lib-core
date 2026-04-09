# Scaffold — Create a New CLI Connector Skill

## Reference Loading

- **Tier 1 (load at start):** `references/cli-contract.md`, `references/runtime-decision.md`
- **Tier 2 (after Step 2):** `references/bun-template.md` **or** `references/bash-template.md`
- **Tier 3 (conditional):** `references/batch-envelope.md` (if batch commands), `references/safety-template.md` (if mutating commands)

## Workflow

### Step 1: Interview — capture the API

Before writing any files, capture these in a single combined prompt. If the user already gave you most of it in conversation, extract what you can and only ask for gaps.

| Field | What to ask for | Why it matters |
|-------|-----------------|----------------|
| Skill name | Short, lowercase, hyphens — e.g. `acme-crm`, `solar-sales` | Becomes the directory name and CLI name |
| Purpose | One sentence: "solar installation CRM", "internal billing API" | Goes in SKILL.md and the description |
| Auth model | API key? Bearer? OAuth? What's the header? | Determines client.ts shape and setup.md |
| Env var name | e.g. `ACME_API_KEY`, `SOLAR_TOKEN` | Read from workspace `.env` |
| Base URL | e.g. `https://api.acme.com/v1` | Hardcoded constant in client |
| Primary objects | What things live in this API? (leads, installs, invoices, …) | Each maps to one or more commands |
| Command inventory | What will the user do? (see verb map below) | Drives cookbook files and cli.ts cases |
| Pagination style | Cursor token? Offset? Page number? None? | Shapes list envelope + batch logic |
| Rate limit | Known throttle? | Client-side enforcement in bun; usually skipped in bash |
| Mutating commands? | Any `update`, `delete`, `send`? | Triggers `references/safety.md` |
| Domain knowledge? | Any non-obvious rules? ("unanswered calls have no transcript", "only count INTEGRATIONS_PLATFORM") | Triggers `expertise.yaml` |

**Verb map** — translate user actions to CLI commands:

| User wants to… | Command shape | Output |
|----------------|---------------|--------|
| Fetch one record by ID | `get-<thing> <id>` | bare JSON |
| List records with filters | `list-<things> [--filter …] [--limit N] [--after CURSOR]` | `{data, paging?}` |
| Extract all records in a time window | `fetch-<things> --since DATE [--until DATE] [--dry-run]` | JSONL stream |
| Mutate a record | `update-<thing> <id> --set k=v` | bare JSON + safety gates |
| Explore API schema / metadata | `schema <aspect>` | bare JSON |

Confirm the summary with the user before proceeding. This is cheaper than rewriting scaffolding.

### Step 2: Pick the runtime

Read `references/runtime-decision.md` and decide. Announce your pick with reasoning:

> "I'm scaffolding this as Bun/TypeScript because it needs cursor pagination and a `fetch-*` batch command — bash would get painful past 300 lines."

> "I'm scaffolding this as Bash because it's 4 read-only commands with no pagination — the overhead of bun/ts isn't worth it."

### Step 3: Decide the target location

Generated skills go under the workspace's skills root. Look for one of these, in order:

1. `./.claude/skills/<name>/` — standard workspace location (default)
2. `<repo>/skills/<name>/` — if the user is inside a plugin repo with its own `skills/` dir

Ask the user if you're unsure. Do not silently overwrite an existing directory — if the target exists, stop and ask.

### Step 4: Generate the scaffold

Load the matching template reference (`references/bun-template.md` or `references/bash-template.md`) and write every file. The template is the source of truth — it contains full file contents with placeholders like `{{SKILL_NAME}}`, `{{ENV_VAR}}`, `{{BASE_URL}}`, `{{DESCRIPTION}}`, `{{COMMANDS}}`.

**Always create:**
- `SKILL.md` — router with frontmatter, commands table, cookbook table, CLI reference block
- `cookbook/<command>.md` — one per command in the inventory, following the cookbook structure in `references/cli-contract.md` (Reference Loading → Workflow → Red Flags)
- `references/setup.md` — env var name, how to obtain the credential, verification command
- The CLI entrypoint (`src/cli.ts` for bun, `scripts/<name>` + `scripts/commands/*.sh` for bash)
- Supporting files (`src/client.ts`, `src/types.ts`, `package.json`, `tsconfig.json` for bun; `scripts/lib/*.sh` for bash)

**Conditionally create:**
- `references/safety.md` — if any mutating commands exist. Copy from `references/safety-template.md`.
- `schemas/` directory — if `fetch-*` batch commands exist. One JSON Schema file per record type, plus `_envelope.json` for the contract-v1 wrapper.
- `expertise.yaml` — only if the user gave you specific domain rules to encode. Don't create empty expertise files — they're noise.

**Implement by default** — ship working code for every command you have enough information to write. If the user told you the endpoint (`GET /v1/invoices/:id`), the auth scheme, and the response shape, write the real `fetch()` call and return the real JSON. You know how REST APIs work; don't pretend you don't.

Only stub a method when you *genuinely cannot infer* the request shape — e.g., the pagination field name is ambiguous, the response envelope isn't documented, or the endpoint itself is unknown. When you stub, leave a `TODO:` comment that names the exact uncertainty so the user knows what to resolve:

```typescript
async listInvoices(params: { limit?: number; after?: string }) {
  // TODO: confirm pagination field — docs mention both `cursor` and `nextPageToken`
  throw new Error("not implemented: listInvoices (unknown pagination field)");
}
```

Either way, every command must be wired up and contract-compliant — a stubbed method emits a JSON error on stderr and exits non-zero, never a language-level crash. But the *default* is working code, not a stub. A connector skill whose `get-invoice` just throws "not implemented" is worse than nothing — the user wanted a working connector, not a filing cabinet of TODOs.

### Step 5: Verify the scaffold runs

Before handing off, the CLI must actually execute. Run these commands in the new skill's directory and confirm each produces the expected output (usage or contract-compliant error, never a crash):

**Bun:**
```bash
cd <skill-path>
bun install
bun run src/cli.ts                       # usage text on stderr, exit 2
bun run src/cli.ts get-foo                # JSON error "missing id", code 2
bun run src/cli.ts get-foo 123            # either real JSON (if credential set) or clean auth error
```

**Bash:**
```bash
cd <skill-path>
chmod +x scripts/<name>
scripts/<name>                            # usage text on stderr, exit 2
scripts/<name> some command               # JSON error, code 1 or 2
```

If any command crashes with a language-level error (TypeError, unbound variable, syntax), fix the scaffold before declaring done. A broken stub is worse than no stub — the user will have to rewrite the shape before they can add logic.

### Step 6: Hand off

Tell the user:

1. **Location** — full absolute path to the new skill
2. **Env var** — what to add to workspace `.env` (e.g., `ACME_API_KEY=...`)
3. **Install** — `bun install` for bun skills; nothing for bash
4. **What's implemented vs stubbed** — for each command, say whether it's working or stubbed, and if stubbed why (one-line reason — "pagination field ambiguous", "response shape unknown")
5. **Where to start** — if anything is still stubbed, point at the remaining TODOs; if everything is implemented, suggest the user run the smallest read command first to verify credentials
6. **Contract reminder** — keep stdout clean, errors go to stderr as JSON, exit codes matter
7. **Cookbook files may need tuning** — tell the user the cookbook files are a first draft and some flags, edge cases, and red flags only become obvious once the real API has been exercised against real data

## Red Flags

- **Defaulting to bun without thinking** — Read `runtime-decision.md`. Some skills really are bash-shaped.
- **Writing plain-text errors** — If your stub ever emits non-JSON to stderr before exiting, the contract is broken. Even stubs need to be compliant.
- **Inventing new output shapes** — Don't add `{success: true, items: [...]}` or `{result: ...}`. List commands return `{data, paging?}`. Primitives return the bare record. Batch uses the v1 envelope. No exceptions.
- **Skipping Step 5** — A scaffold that crashes on `--help` is a regression from writing nothing. Verify it runs.
- **Creating expertise.yaml speculatively** — Only include it when the user has specific rules to encode. Empty or generic expertise files add noise and waste context.
- **Overwriting existing skills silently** — If the target directory exists, stop and ask. The user may have work in there.
- **Hiding behind stubs when you have enough info to write the real call** — If the user gave you the endpoint path, the auth scheme, and the response shape, write the real `fetch()` call. Stubbing every method because "the user writes the real code" is cargo-culting — the user's whole request was to get a working connector, not an empty shell. Stub only the methods where you genuinely don't know the request/response shape.
- **Single-word cookbook files** — Each cookbook file should have Reference Loading, Workflow with numbered steps, and Red Flags. A 5-line cookbook file isn't a cookbook — fold it into SKILL.md or merge with another command.
