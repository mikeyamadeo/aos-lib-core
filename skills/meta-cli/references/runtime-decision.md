# Runtime Decision — Bash vs Bun/TypeScript

There is no universal default. The right runtime depends on what the API demands and how the skill will grow. Read this before picking; announce your choice with reasoning.

## Quick Decision Matrix

| Factor | Bash (like `slack`) | Bun/TS (like `hubspot`, `quo`) |
|--------|---------------------|--------------------------------|
| CLI size | < 300 LOC total | Any size |
| Commands | ≤ 10, mostly simple | 10+ or complex |
| Pagination | None, or trivial offset | Cursor tokens, continuation |
| JSONL batch | None | Yes |
| Rate limiting | API is forgiving | Need client-side throttle |
| Record types | 1–2 shapes | Many typed records |
| Complex errors | Mostly 2xx/4xx | 404/403 mean "absent", not error |
| Dependencies | Prefer zero | OK to have `package.json` |
| Startup latency | Sub-10ms | ~100ms (bun) |

## Pick **Bash** when:

The CLI is essentially a structured wrapper around `curl` + `jq`. You have a handful of commands that each hit one endpoint, transform the response slightly, and emit JSON. No batch extraction, no cursor pagination, no typed record graph.

**Example — `slack`:** ~10 commands (`auth check`, `channels list`, `users lookup`, `messages send|read|delete|search`, `files upload`, `dms open`). Each is a single API call with a small amount of parameter munging. The whole CLI fits in ~500 LOC of bash across `scripts/<name>` + `lib/*.sh` + `commands/*.sh`.

**Why bash works here:**
- Thin logic → no types needed
- One flat directory → easy to reason about
- Zero deps → nothing to install, nothing to break
- Fast cold start → `jq` and `curl` are always available

**Bash tradeoffs:**
- Scales poorly past ~500 LOC — error handling becomes tedious, `set -euo pipefail` + traps are annoying
- No real types means refactoring is risky
- JSONL batch is painful to implement correctly (no stream processing primitives)
- Testing is hard

## Pick **Bun/TypeScript** when:

Any ONE of these is true:

1. **You need cursor pagination.** Token-based pagination is tricky enough that typed helpers pay for themselves immediately.
2. **You need JSONL batch commands.** The `meta → records → summary` envelope, dedup, enrichment gating, and `--dry-run` all benefit enormously from typed records and async iterators.
3. **You need client-side rate limiting.** Retries with exponential backoff, throttles, 429 handling — all much cleaner with `async`/`await` and a real HTTP client.
4. **You have many record types.** 5+ distinct shapes (calls, messages, contacts, users, phone numbers…) → typed interfaces prevent drift.
5. **The API has quirky error semantics.** E.g., 404 on an enrichment endpoint means "absent" (return null, keep going), while 404 on the primary endpoint means "not found" (fatal). Typed error handling makes this tractable.

**Example — `quo`:** 20+ commands, 3 batch commands, cursor pagination, retry/backoff, 7 schema files. Bun/TS scaffold (`src/cli.ts` + `src/client.ts` + `src/types.ts`) keeps it manageable.

**Example — `hubspot`:** 14+ commands, 6 batch fetch commands, 13 object types with different default properties, association expansion, filter translation. Bash would be a nightmare.

**Bun/TS tradeoffs:**
- Requires `bun install` on first use — a small but real friction for the user
- Needs `package.json` + `tsconfig.json` + `bun.lock` in the scaffold
- ~100ms startup vs bash's ~10ms (still fast enough for interactive use)

## When the API is bespoke / internal

Most bespoke APIs (internal CRMs, solar sales platforms, vendor-specific tools) fall into the **bun/TS** bucket because:

- Internal APIs tend to be larger-surfaced than you think
- They usually paginate (or should)
- You'll want to add batch extraction later
- Typed records save time when the schema is only documented by the code itself

**Default guidance for bespoke APIs:** start with bun/TS unless the user is explicit about wanting a minimal bash wrapper. You can always downgrade; it's harder to upgrade.

## Migration path

You can always promote a bash skill to bun later. The cookbook files and SKILL.md router don't change — only the CLI implementation moves from `scripts/<name>` to `src/cli.ts`. Write cookbooks that describe the CLI contract abstractly ("run the `get-call` command") so they stay accurate through a runtime swap.

## Decision Announcement

Whatever you pick, tell the user explicitly with one sentence of reasoning:

> "I'm scaffolding this as Bun/TypeScript — the Acme API uses cursor pagination and you mentioned wanting to extract all leads for the last 90 days, which needs a `fetch-leads` batch command."

> "I'm scaffolding this as Bash — this is 4 read-only endpoints with no pagination, and the `gh`-style shell wrapper is enough."

This way the user can push back before you write 20 files.
