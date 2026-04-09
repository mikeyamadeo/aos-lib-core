# Bun / TypeScript Template

Use this template when `runtime-decision.md` says Bun/TS. Every file below has placeholders in `{{DOUBLE_BRACES}}` — substitute them from the interview data before writing to disk.

## File Tree

```
{{SKILL_NAME}}/
├── SKILL.md
├── package.json
├── tsconfig.json
├── cookbook/
│   ├── {{COMMAND_1}}.md
│   └── {{COMMAND_N}}.md
├── references/
│   └── setup.md
└── src/
    ├── cli.ts
    ├── client.ts
    └── types.ts
```

Optional (conditionally create):
- `references/safety.md` — if any mutating commands (copy from `safety-template.md`)
- `schemas/` with `_envelope.json` + one file per record type — if any `fetch-*` batch commands
- `expertise.yaml` — only if the user supplied domain knowledge

---

## `SKILL.md`

```markdown
---
name: {{SKILL_NAME}}
description: >-
  {{PUSHY_DESCRIPTION — what it does, when to trigger. See guidance below.}}
argument-hint: "<command> [options]"
---

# {{SKILL_TITLE}}

{{ONE_PARAGRAPH_SUMMARY}} — via the co-located `{{SKILL_NAME}}` CLI.

## Prerequisites

- `{{ENV_VAR}}` in environment (required for all API calls)

## Commands

| Command | Purpose | Output |
|---------|---------|--------|
| `{{CMD_1}}` | {{PURPOSE_1}} | JSON |
| `{{CMD_N}}` | {{PURPOSE_N}} | JSON/JSONL |

## Cookbook

| Command | File | Use When |
|---------|------|----------|
| `{{CMD_1}}` | `cookbook/{{CMD_1}}.md` | {{USE_WHEN_1}} |
| `{{CMD_N}}` | `cookbook/{{CMD_N}}.md` | {{USE_WHEN_N}} |

Read the matching cookbook file first, then execute the steps.

## CLI

All commands use the co-located CLI:

```
bun run src/cli.ts <command> [options]
```

Or, from outside the skill directory:

```
bun --cwd <skill_dir> src/cli.ts <command> [options]
```

The CLI reads `{{ENV_VAR}}` from `.env` at the workspace root. See `references/setup.md` for setup.

## CLI Commands Reference

```
{{SKILL_NAME}} {{CMD_1}} [args]        # {{PURPOSE_1}}
{{SKILL_NAME}} {{CMD_N}} [args]        # {{PURPOSE_N}}
```

All output is JSON on stdout. Errors are JSON on stderr: `{"error": "...", "code": N}`.

**Exit codes:** `0` success, `1` unexpected, `2` input validation, `3` auth/API.
```

**Pushy description guidance:** The description is the primary trigger mechanism. Include specific user phrases ("find leads in the solar CRM", "look up install by address") AND the skill's domain name AND an EXCLUDE line that prevents false positives. Aim for 2–4 sentences.

---

## `package.json`

```json
{
  "name": "{{SKILL_NAME}}",
  "private": true,
  "type": "module",
  "scripts": {
    "cli": "bun run src/cli.ts"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.3.0"
  }
}
```

Zero runtime dependencies by default. Bun provides HTTP, crypto, parseArgs, and file I/O via built-ins. Add runtime deps only if absolutely necessary (and justify it in a comment in the package.json).

---

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "types": ["bun-types"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*.ts"]
}
```

---

## `src/types.ts`

```typescript
/**
 * {{SKILL_NAME}} — Type definitions for API records and internal envelopes.
 */

// ── API record types ──────────────────────────────────────────

export interface {{PRIMARY_RECORD}} {
  id: string;
  // TODO: fill in fields from the API spec
}

// ── Pagination envelope (list commands) ───────────────────────

export interface PagedResponse<T> {
  data: T[];
  nextPageToken?: string | null;
}

export interface PaginatedOutput<T> {
  data: T[];
  paging?: {
    next: {
      after: string;
    };
  };
}

// ── Batch envelope (fetch commands) ───────────────────────────

export interface MetaRecord {
  _type: "meta";
  contract_version: "v1";
  command: string;
  run_id: string;
  generated_at: string;
  [key: string]: unknown;
}

export interface SummaryRecord {
  _type: "summary";
  total: number;
  skipped: number;
  errors: number;
  elapsed_seconds: number;
}
```

---

## `src/client.ts`

```typescript
/**
 * {{SKILL_NAME}} — API client.
 *
 * Pure fetch, zero runtime dependencies. Uses Bun's built-in fetch.
 */

import type { {{PRIMARY_RECORD}}, PagedResponse } from "./types.ts";

const BASE_URL = "{{BASE_URL}}";
const RATE_LIMIT_INTERVAL_MS = 100; // tune per API; 10 req/s default
const MAX_RETRIES = 3;

export class {{CLIENT_CLASS}}Error extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "{{CLIENT_CLASS}}Error";
  }
}

export class {{CLIENT_CLASS}} {
  private token: string;
  private lastRequestAt = 0;

  constructor(token?: string) {
    const t = token ?? process.env.{{ENV_VAR}};
    if (!t) {
      throw new Error("{{ENV_VAR}} environment variable is required");
    }
    this.token = t;
  }

  private async throttle(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < RATE_LIMIT_INTERVAL_MS) {
      await Bun.sleep(RATE_LIMIT_INTERVAL_MS - elapsed);
    }
    this.lastRequestAt = Date.now();
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    await this.throttle();

    let attempt = 0;
    while (true) {
      const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
          "Authorization": `Bearer ${this.token}`, // TODO: adjust per API auth scheme
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...init.headers,
        },
      });

      if (res.ok) {
        return (await res.json()) as T;
      }

      // Retry 429 and 5xx
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
        const backoff = Math.pow(2, attempt) * 500;
        await Bun.sleep(backoff);
        attempt++;
        continue;
      }

      const body = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        throw new {{CLIENT_CLASS}}Error("Authentication failed — check {{ENV_VAR}}", res.status, body);
      }
      throw new {{CLIENT_CLASS}}Error(`HTTP ${res.status}: ${body.slice(0, 200)}`, res.status, body);
    }
  }

  // ── Primitive methods ──────────────────────────────────────
  //
  // Replace these placeholder bodies with real calls — the scaffolder should
  // write working implementations when the endpoint path and response shape
  // are known from the interview. Only leave a `throw new Error("not implemented: ...")`
  // if you genuinely don't know the request/response shape, and name the uncertainty
  // in the error message so the user knows what to resolve.

  async get{{PRIMARY_RECORD}}(id: string): Promise<{{PRIMARY_RECORD}}> {
    return await this.request<{{PRIMARY_RECORD}}>(`/{{PRIMARY_PATH}}/${encodeURIComponent(id)}`);
  }

  // ── List methods (paginated) ───────────────────────────────

  async list{{PRIMARY_RECORD}}s(params: {
    limit?: number;
    after?: string;
  }): Promise<PagedResponse<{{PRIMARY_RECORD}}>> {
    const query = new URLSearchParams();
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.after !== undefined) query.set("after", params.after);
    const qs = query.toString();
    return await this.request<PagedResponse<{{PRIMARY_RECORD}}>>(
      `/{{PRIMARY_PATH}}${qs ? `?${qs}` : ""}`,
    );
  }
}
```

---

## `src/cli.ts`

```typescript
#!/usr/bin/env bun
/**
 * {{SKILL_NAME}} CLI — primitives (JSON) and batch (JSONL) for {{API_DESCRIPTION}}.
 *
 * Usage:
 *   bun run src/cli.ts get-{{thing}} <id>
 *   bun run src/cli.ts list-{{things}} [--limit N] [--after CURSOR]
 */

import { parseArgs } from "node:util";
import { {{CLIENT_CLASS}}, {{CLIENT_CLASS}}Error } from "./client.ts";
import type { PagedResponse, PaginatedOutput } from "./types.ts";

// ── Output helpers ────────────────────────────────────────────

function emitJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

function emit(record: object): void {
  process.stdout.write(JSON.stringify(record) + "\n");
}

function error(msg: string, code: number): never {
  process.stderr.write(JSON.stringify({ error: msg, code }) + "\n");
  process.exit(code);
}

function emitPaged<T>(page: PagedResponse<T>): void {
  const output: PaginatedOutput<T> = { data: page.data };
  if (page.nextPageToken) {
    output.paging = { next: { after: page.nextPageToken } };
  }
  emitJson(output);
}

// ── Client init ───────────────────────────────────────────────

function getClient(): {{CLIENT_CLASS}} {
  try {
    return new {{CLIENT_CLASS}}();
  } catch {
    error("{{ENV_VAR}} environment variable is required", 3);
  }
}

// ── Commands ──────────────────────────────────────────────────

const DEFAULT_LIMIT = 50;

async function get{{PrimaryRecord}}(args: string[]): Promise<void> {
  const id = args[0];
  if (!id) error("Usage: get-{{thing}} <id>", 2);
  try {
    emitJson(await getClient().get{{PRIMARY_RECORD}}(id));
  } catch (err) {
    if (err instanceof {{CLIENT_CLASS}}Error) error(err.message, 3);
    throw err;
  }
}

async function list{{PrimaryRecord}}s(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      limit: { type: "string", default: String(DEFAULT_LIMIT) },
      after: { type: "string" },
    },
    allowPositionals: true,
    strict: true,
  });

  const limit = parseInt(values.limit!, 10);
  if (Number.isNaN(limit) || limit < 1) error("--limit must be a positive integer", 2);

  try {
    const page = await getClient().list{{PRIMARY_RECORD}}s({ limit, after: values.after });
    emitPaged(page);
  } catch (err) {
    if (err instanceof {{CLIENT_CLASS}}Error) error(err.message, 3);
    throw err;
  }
}

// ── Dispatch ──────────────────────────────────────────────────

const USAGE = `Usage: {{SKILL_NAME}} <command> [args]

Commands:
  get-{{thing}} <id>                       Get a single record by ID
  list-{{things}} [--limit N] [--after C]  List records with pagination
`;

async function main(): Promise<void> {
  const [, , command, ...rest] = process.argv;

  if (!command || command === "--help" || command === "-h") {
    process.stderr.write(USAGE);
    process.exit(2);
  }

  switch (command) {
    case "get-{{thing}}":
      await get{{PrimaryRecord}}(rest);
      break;
    case "list-{{things}}":
      await list{{PrimaryRecord}}s(rest);
      break;
    default:
      error(`Unknown command: ${command}`, 2);
  }
}

main().catch((err) => {
  if (err instanceof {{CLIENT_CLASS}}Error) error(err.message, 3);
  error(`Unexpected: ${err instanceof Error ? err.message : String(err)}`, 1);
});
```

---

## `references/setup.md`

```markdown
# Setup

## Authentication

The {{SKILL_NAME}} skill uses the `{{ENV_VAR}}` environment variable for authentication.

Set in `.env` at workspace root:
```
{{ENV_VAR}}=your-api-key-here
```

Get a key at: {{AUTH_DOCS_URL_OR_CONTACT}}

## Verification

Test authentication with the smallest read command:
```bash
bun run src/cli.ts {{VERIFY_COMMAND}}
```

If the key is missing, the CLI exits with code 3 and a JSON error:
```json
{"error": "{{ENV_VAR}} environment variable is required", "code": 3}
```

If the key is invalid (401), the CLI exits with code 3:
```json
{"error": "Authentication failed — check {{ENV_VAR}}", "code": 3}
```

## Runtime

- **Runtime:** Bun (invoked via `bun run src/cli.ts <command>`)
- **Dependencies:** Zero runtime deps. Uses Bun built-ins for HTTP, parseArgs, sleep, crypto.
- **Rate limit:** {{RATE_LIMIT_DESCRIPTION}}
- **Retries:** Up to 3 attempts with exponential backoff for 429/5xx responses
```

---

## Cookbook File Template

For each command in the inventory, create `cookbook/<command>.md`:

```markdown
# {{COMMAND}} — {{SHORT_DESCRIPTION}}

## Reference Loading

- **Tier 1 (load at start):** `references/setup.md`  (remove if not needed for this command)

## Workflow

### Step 1: {{FIRST_STEP_VERB}}

Run:

```bash
bun run src/cli.ts {{COMMAND}} {{ARGS}}
```

{{WHAT_TO_LOOK_FOR_IN_THE_OUTPUT}}

### Step 2: {{SECOND_STEP_VERB}}

{{WHAT_TO_DO_NEXT}}

### Step 3: {{PRESENT_OR_FOLLOW_UP}}

{{HOW_TO_PRESENT_RESULTS}}

## Red Flags

- {{COMMON_MISTAKE_1}}
- {{COMMON_MISTAKE_2}}
```

Every cookbook file should have all three sections (Reference Loading, Workflow, Red Flags) — even if Reference Loading is just "load setup.md once at the start of the session."

---

## Substitution Checklist

Before declaring the scaffold complete, grep the output tree for any remaining `{{...}}` placeholders. None should remain — if any do, you missed a substitution.

```bash
grep -r '{{' <skill-path> && echo "MISSED PLACEHOLDERS" || echo "clean"
```
