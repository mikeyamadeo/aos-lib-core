# Add-Batch — Add `fetch-*` Commands to an Existing CLI Skill

Use this when the user has an existing connector skill (probably bun/TS) with only primitives and wants to add batch JSONL extraction for orchestrator use.

## Reference Loading

- **Tier 1 (load at start):** `references/cli-contract.md`, `references/batch-envelope.md`
- **Tier 2 (when creating schemas/ if missing):** `references/bun-template.md` (the schema section)

## When to use this

The user says things like:
- "add a `fetch-leads` command to the acme-crm skill"
- "I need batch extraction for the solar-sales skill"
- "the orchestrator needs to pull all calls — add batch to quo"

If the skill doesn't exist yet, use `scaffold.md` instead and include the batch command in the initial inventory.

## Workflow

### Step 1: Read the existing skill

Before writing anything, understand what's already there. Read in parallel:

- `<skill>/SKILL.md` — to understand current commands and the router's Commands table
- `<skill>/src/cli.ts` (or `scripts/<name>`) — to see how existing commands are structured
- `<skill>/src/client.ts` (if bun) — to understand auth, pagination, and request helpers
- `<skill>/src/types.ts` (if bun) — to see existing record types
- `<skill>/cookbook/` — to match the existing cookbook style

Don't assume — the existing skill's conventions (naming, error handling, argument parsing) must match the new batch command or the skill becomes internally inconsistent.

### Step 2: Interview for batch specifics

Ask the user (combine into one prompt):

1. **Which records?** — e.g., "leads", "invoices", "installs". One batch command per record type.
2. **Time window filter?** — Does the API support `updated_after` / `created_at` filters? What's the field name?
3. **Pagination style** — Cursor, offset, or page number? How does the existing client handle it?
4. **Enrichment?** — Do you need per-record follow-up calls (like quo's transcript/summary enrichments)? If yes, which endpoints and when?
5. **Dedup?** — Are there known duplicates to skip? Source filter? Integration tag?
6. **Expected volume** — Rough records per day/week. Informs whether cap-splitting warnings are needed in the cookbook.

### Step 3: Add the record type

In `src/types.ts`, add:

```typescript
export interface {{BatchRecord}} {
  _type: "{{record_type}}";
  {{record_field}}: {{RecordShape}};
  synced_at: string;
  // ... enrichment fields if any
}
```

The `synced_at` field is mandatory on every data record.

### Step 4: Add the batch method to the client

In `src/client.ts`, add a paginated iterator. The method should be an `AsyncIterable` that yields records one at a time, handling pagination internally:

```typescript
async *paginate{{Things}}(params: {
  since: string;
  until?: string;
}): AsyncIterable<{{RecordShape}}> {
  let after: string | undefined;
  do {
    const page = await this.list{{Things}}({ ...params, limit: 100, after });
    for (const record of page.data) {
      yield record;
    }
    after = page.nextPageToken ?? undefined;
  } while (after);
}
```

### Step 5: Add the `fetch-*` command to the CLI

In `src/cli.ts`, add:

```typescript
async function fetch{{Things}}(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      since:        { type: "string" },
      until:        { type: "string" },
      "dry-run":    { type: "boolean", default: false },
      "output-dir": { type: "string" },
    },
    strict: true,
  });

  if (!values.since) error("--since is required", 2);

  const runId = crypto.randomUUID();
  const startedAt = Date.now();
  const stdoutMode = !values["output-dir"];

  if (stdoutMode) {
    emit(meta("fetch-{{things}}", runId, { since: values.since, until: values.until }));
  }

  const client = getClient();
  let total = 0;
  let skipped = 0;
  let errors = 0;

  try {
    for await (const record of client.paginate{{Things}}({ since: values.since, until: values.until })) {
      const enriched: {{BatchRecord}} = {
        _type: "{{record_type}}",
        {{record_field}}: record,
        synced_at: new Date().toISOString(),
      };

      if (values["dry-run"]) {
        total++;
        continue;
      }

      if (stdoutMode) {
        emit(enriched);
      } else {
        const path = join(values["output-dir"]!, `${record.id}.json`);
        try {
          mkdirSync(dirname(path), { recursive: true });
          writeFileSync(path, JSON.stringify(enriched, null, 2));
        } catch (err) {
          process.stderr.write(`write error: ${path} — ${err instanceof Error ? err.message : String(err)}\n`);
          errors++;
          continue;
        }
      }
      total++;
    }
  } catch (err) {
    if (err instanceof {{ClientClass}}Error) error(err.message, 3);
    throw err;
  }

  const elapsed = (Date.now() - startedAt) / 1000;
  if (stdoutMode || values["dry-run"]) {
    emit(summary(total, skipped, errors, elapsed));
  }
}
```

Add the case to the dispatch `switch`:

```typescript
case "fetch-{{things}}":
  await fetch{{Things}}(rest);
  break;
```

And update the `USAGE` string to list the new command.

### Step 6: Add the cookbook file

Create `cookbook/batch-sync.md` (or append to it if it already exists):

```markdown
# Batch Sync — JSONL Extraction for Orchestrators

## Reference Loading

- **Tier 1 (load at start):** none required for use, but read `references/setup.md` if auth isn't already validated

## Overview

Batch commands stream JSONL with contract-v1 envelope (meta → records → summary). These are consumed by orchestrators, not directly by agents in conversation.

## Workflow

### Step 1: Choose the command

- `fetch-{{things}}` — {{WHAT_IT_EXTRACTS}}

### Step 2: Run

\`\`\`bash
bun run src/cli.ts fetch-{{things}} --since 2026-03-25 [--until 2026-04-01] [--dry-run]
\`\`\`

**Required:** `--since`
**Optional:** `--until`, `--dry-run`, `--output-dir DIR`

### Step 3: Pipe or write

Pipe to a file:

\`\`\`bash
bun run src/cli.ts fetch-{{things}} --since 2026-03-25 > {{things}}.jsonl
\`\`\`

Or write individual JSON files to a directory:

\`\`\`bash
bun run src/cli.ts fetch-{{things}} --since 2026-03-25 --output-dir ./out
\`\`\`

### Step 4: Check the summary

Every JSONL stream ends with `{"_type": "summary", "total": N, ...}`. The `skipped` and `errors` counts tell you if anything went wrong.

## Red Flags

- **Running without `--dry-run` first** for large windows. Use dry-run to check counts before committing to a long extraction.
- **Missing `--since`** — the command will exit with code 2.
- **Time window too wide** — if the API has a cap (e.g., 10,000 records per query), narrow the window and run multiple passes.
- **Using `--output-dir` and expecting meta/summary on stdout** — in `--output-dir` mode, meta and summary are NOT emitted.
```

### Step 7: Update SKILL.md

Add the new command to both tables in `SKILL.md`:

**Commands table:**
```markdown
| `fetch-{{things}}` | Batch extract {{things}} with optional dry-run | JSONL |
```

**Cookbook table:**
```markdown
| `fetch-*` | `cookbook/batch-sync.md` | Orchestrator needs batch JSONL extraction |
```

Also update the CLI Commands Reference block with the new command signature.

### Step 8: Add schemas (if not present)

If the skill doesn't have a `schemas/` directory yet, create one:

- `schemas/_envelope.json` — copy from `references/batch-envelope.md`
- `schemas/{{record_type}}.json` — one file per new record type

If schemas already exist, add the new record type as a sibling file.

### Step 9: Verify

```bash
cd <skill-path>
bun run src/cli.ts fetch-{{things}}                              # should error "--since is required", code 2
bun run src/cli.ts fetch-{{things}} --since 2026-03-25 --dry-run  # should emit meta + summary (no data)
```

If either of these crashes instead of emitting a clean JSON error or valid JSONL, fix before handing off.

## Red Flags

- **Skipping the interview** — every API's pagination and filtering is different. Don't assume; ask.
- **Implementing without reading the existing client** — the client already has auth, throttle, and error-handling patterns. Reuse them.
- **Forgetting `synced_at`** — every data record needs it. Orchestrators dedupe and backfill by this field.
- **Breaking stdout in `--output-dir` mode** — don't emit meta/summary when writing to a directory, or they'll appear as files named `undefined.json`.
- **Not updating SKILL.md** — the router is how Claude discovers the command. A command that exists in cli.ts but not in SKILL.md is invisible to most users.
