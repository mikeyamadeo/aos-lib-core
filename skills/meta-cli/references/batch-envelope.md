# Batch JSONL Envelope — contract-v1

Load this reference when scaffolding or adding a `fetch-*` command. The envelope is shared across all connector skills (hubspot, quo) so orchestrators can treat them interchangeably.

## Stream Structure

Three phases, emitted in order on stdout:

```
{"_type": "meta", ...}           ← line 1
{"_type": "<record_type>", ...}  ← lines 2..N (one per record)
{"_type": "summary", ...}        ← last line
```

**With `--output-dir DIR`:** records are written as individual JSON files in `DIR/`, one per record. Meta and summary are **not** emitted to stdout in this mode (they'd contaminate the directory). Use `--dry-run` together with `--output-dir` if you want a summary without writing files.

## MetaRecord

Emitted as the first line. Must include:

| Field | Type | Description |
|-------|------|-------------|
| `_type` | `"meta"` | Discriminator |
| `contract_version` | `"v1"` | Schema version — hardcoded |
| `command` | `string` | CLI command name, e.g. `"fetch-calls"` |
| `run_id` | `string` | UUID for this extraction run (for dedup/traceability) |
| `generated_at` | `string` | ISO 8601 timestamp |

Optional additional fields are allowed (e.g., `enrichment_strategy`, `since`, `until`, `phone_number_id`) — document them in the skill's `references/batch-contract.md`.

```json
{"_type":"meta","contract_version":"v1","command":"fetch-calls","run_id":"9f3c…","generated_at":"2026-04-09T12:00:00Z","since":"2026-03-25","enrichment_strategy":"auto"}
```

## Data Records

One JSONL line per record. The `_type` field discriminates between record types within a single stream (useful when a batch command emits multiple kinds, e.g., `call` + `message_bundle`).

```json
{"_type":"call","call":{…},"recordings":[…],"transcript":{…},"summary":{…},"synced_at":"2026-04-09T12:00:01Z"}
```

**Required fields on every data record:**
- `_type` — discriminator (`"call"`, `"contact"`, `"message_bundle"`, etc.)
- `synced_at` — ISO 8601 timestamp of when this record was extracted (not when it was created in the source API)

Beyond that, records carry whatever fields make sense for the record type. Document them in a per-skill `references/batch-contract.md`.

## SummaryRecord

Emitted as the last line.

| Field | Type | Description |
|-------|------|-------------|
| `_type` | `"summary"` | Discriminator |
| `total` | `number` | Records successfully processed |
| `skipped` | `number` | Records skipped (e.g., dedup, filter, dry-run) |
| `errors` | `number` | Counted errors (see below — usually 0) |
| `elapsed_seconds` | `number` | Wall-clock time for the whole run |

```json
{"_type":"summary","total":42,"skipped":3,"errors":0,"elapsed_seconds":12.34}
```

**About `errors`:** This field tracks counted, recoverable errors — usually just file-write failures in `--output-dir` mode. Transient enrichment failures (e.g., 404 on a transcript endpoint) are logged to stderr as plain text and set to null in the record; they do NOT increment this counter. Unrecoverable errors (auth, network) abort the run with exit code 3 instead.

## Error Handling During Batch

Batch commands run for a long time — minutes to hours. Failures must degrade gracefully:

| Failure | What to do |
|---------|-----------|
| Auth (401/403) | Abort immediately with exit code 3. The user has to fix the token. |
| Rate limit (429) | Retry with exponential backoff. If still failing after max retries, abort with code 3. |
| Transient 5xx | Same as 429. |
| 404 on primary record | Skip it, log `note: record <id> not found (404)` to stderr, continue. Increment `skipped`. |
| 404/403 on enrichment endpoint | Set the enriched field to null, log `note: <label> not available (HTTP 404)`, continue. Do NOT abort, do NOT count as error. |
| File write failure (`--output-dir`) | Log to stderr, increment `errors`, continue. |
| Unknown exception | Abort with exit code 1 (unexpected error). |

## --dry-run Semantics

`--dry-run` counts records without emitting data. The meta and summary are still emitted so the user can see what would happen:

```
{"_type":"meta","contract_version":"v1","command":"fetch-calls",...}
{"_type":"summary","total":1247,"skipped":0,"errors":0,"elapsed_seconds":3.2}
```

No data records between them. This lets users plan capacity ("I was going to extract 7 days — that's 9000 records, below the cap — proceeding").

## Schema Files

When a batch command exists, the skill should have a `schemas/` directory with:

- `_envelope.json` — JSON Schema for the meta/summary/paged envelopes
- One file per record type (e.g., `call.json`, `contact.json`)

Example `_envelope.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "{{skill}}/v1/envelope",
  "title": "{{Skill}} batch envelope",
  "oneOf": [
    {
      "properties": {
        "_type": {"const": "meta"},
        "contract_version": {"const": "v1"},
        "command": {"type": "string"},
        "run_id": {"type": "string"},
        "generated_at": {"type": "string", "format": "date-time"}
      },
      "required": ["_type", "contract_version", "command", "run_id", "generated_at"]
    },
    {
      "properties": {
        "_type": {"const": "summary"},
        "total": {"type": "integer"},
        "skipped": {"type": "integer"},
        "errors": {"type": "integer"},
        "elapsed_seconds": {"type": "number"}
      },
      "required": ["_type", "total", "skipped", "errors", "elapsed_seconds"]
    }
  ]
}
```

Schemas document the contract. They don't need to be enforced at runtime unless the user is already using ajv or similar.
