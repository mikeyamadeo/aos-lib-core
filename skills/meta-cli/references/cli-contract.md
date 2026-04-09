# CLI Contract — JSON I/O, Errors, Exit Codes, Envelopes

Every CLI connector skill follows the same contract. This is non-negotiable — downstream tooling (orchestrators, `jq` pipelines, other skills) depends on it. Read this file before scaffolding; use it as the checklist when you verify a stub runs.

## Output Streams

- **stdout** — Data only. JSON for single records and list responses. JSONL for batch streams. **Never** log to stdout. Never write progress text to stdout.
- **stderr** — Errors, warnings, and progress. Fatal errors are JSON. Progress and soft warnings are plain text, one per line. Distinguishable by: JSON starts with `{`, text doesn't.

## Error Format

Fatal errors are a single JSON object on stderr, followed by a non-zero exit:

```json
{"error": "human-readable message", "code": N}
```

`N` matches the exit code. The message is for humans — useful, specific, no secrets (never echo the auth token).

## Exit Codes

| Code | Meaning | When |
|------|---------|------|
| `0` | Success | Command ran and emitted its output |
| `1` | Unexpected error | Uncaught exception, programming bug, stub not implemented |
| `2` | Input validation error | Bad flag, missing required arg, malformed filter, invalid date |
| `3` | API error | Auth failure (401/403), rate limit (429), not found (404), 5xx |

Keep `2` and `3` distinct. Input validation happens **before** any network call. A 4xx response from the API is code `3`, not `2`.

## Command Categories

Connector skills have three kinds of commands. Each has its own output shape.

### Primitive — `get-<thing>`

Takes an ID, returns the bare record.

```bash
quo get-call AC123
```
```json
{"id": "AC123", "duration": 45, "participants": ["+15551234567"], ...}
```

No envelope. Just the record.

### List — `list-<things>`

Returns `{data, paging?}`. `paging` is present only when there are more results.

```bash
quo list-calls --phone-number-id PN1 --participants +15551234567 --limit 50
```
```json
{
  "data": [{"id": "AC1", ...}, {"id": "AC2", ...}],
  "paging": {"next": {"after": "cursor-token-here"}}
}
```

**Required flags:** `--limit N` (default 50), `--after CURSOR`.

The `paging.next.after` value is a string cursor — opaque to the caller. The next call passes it back verbatim via `--after`.

### Batch — `fetch-<things>`

Streams JSONL with a three-phase envelope:

```
{"_type": "meta",    "contract_version": "v1", "command": "fetch-calls", "run_id": "uuid", "generated_at": "2026-04-09T12:00:00Z", ...}
{"_type": "call",    ...}   ← 1..N data records
{"_type": "call",    ...}
{"_type": "summary", "total": 42, "skipped": 0, "errors": 0, "elapsed_seconds": 12.3}
```

**Required flags:**
- `--since <date>` — start of time window (ISO date or epoch ms)
- `--dry-run` — count records without emitting, still prints meta + summary

**Optional flags:**
- `--until <date>` — end of window (defaults to now)
- `--output-dir DIR` — write each record as an individual JSON file instead of stdout JSONL. In this mode, meta and summary are NOT emitted to stdout (they'd contaminate the directory).

**Error handling during batch** — Enrichment failures (e.g., 404 on a transcript endpoint for an unanswered call) do NOT fail the whole run. Log to stderr as plain text (`note: transcript not available (HTTP 404)`), set the field to null, continue. Only unrecoverable failures (auth, network) abort.

See `references/batch-envelope.md` for the full JSONL schema.

## Mutating Commands — Safety Contract

For `update-*`, `delete-*`, `send-*`, or any command that changes state on the remote side, follow the 3-step dance:

1. **Validate auth** — fail fast before drafting anything
2. **Draft** — show the user exactly what will happen (target, change, before/after)
3. **Confirm** — wait for explicit approval
4. **Execute** — run the mutation, report the outcome

This lives in `references/safety.md` of the generated skill. Copy it from `references/safety-template.md` when scaffolding any mutating skill.

## Date Handling

Accept either ISO strings (`2026-03-25`, `2026-03-25T14:00:00Z`) or epoch milliseconds where appropriate. Most skills should auto-expand date-only strings (`2026-03-25` → `2026-03-25T00:00:00Z`) to spare users the typing. Document the behavior in the CLI reference block in SKILL.md and note it in the cookbook for any flag that takes a date.

HubSpot is an exception: its search filters require epoch ms, not ISO. Respect API quirks — don't paper over them, just document clearly.

## No stdin

CLIs don't read from stdin. All input is via args and env vars. This keeps them trivially composable with `xargs`, shell loops, and orchestrator pipelines. If you need to pass a list of IDs, use `--ids ID1,ID2,ID3` or `--ids-file FILE`, not stdin.

## Environment Variables

- Exactly one auth env var per skill (e.g., `QUO_API_KEY`, `HUBSPOT_SERVICE_KEY`, `SLACK_USER_OAUTH_TOKEN`)
- Read from the workspace `.env` automatically — the CLI should not require the user to export it manually
- Optional identity env vars (e.g., `HUBSPOT_OWNER_ID`) allowed when the API has a "current user" concept
- Never log the env var value. On auth failure, say "check <VAR>" but never echo it

## Cookbook File Structure

Every cookbook file in a generated skill should follow this structure:

```markdown
# <Command> — <Short Description>

## Reference Loading

- **Tier 1 (load at start):** `references/<file>.md`  (if any)
- **Tier 2 (conditional):** `references/<file>.md`    (if any)

## Workflow

### Step 1: <Verb phrase>
<what to do, with code>

### Step 2: <Verb phrase>
<what to do>

### Step 3: <Verb phrase>
<what to do>

## Red Flags
- Specific mistake 1
- Specific mistake 2
```

Keep each cookbook focused on one command or one closely-related workflow. If a file is under 20 lines, merge it with another. If it's over 150 lines, split it.
