# Bash Template

Use this template when `runtime-decision.md` says bash. Substitute `{{DOUBLE_BRACES}}` placeholders before writing to disk.

## File Tree

```
{{SKILL_NAME}}/
├── SKILL.md
├── cookbook/
│   ├── {{COMMAND_1}}.md
│   └── {{COMMAND_N}}.md
├── references/
│   └── setup.md
└── scripts/
    ├── {{SKILL_NAME}}           # main entrypoint (chmod +x)
    ├── lib/
    │   ├── env.sh
    │   ├── api.sh
    │   └── pagination.sh        # only if API paginates
    └── commands/
        ├── {{command-1}}.sh
        └── {{command-n}}.sh
```

Optional (conditionally create):
- `references/safety.md` — if any mutating commands
- `scripts/lib/resolve.sh` — if the skill does ID/name resolution (e.g., channel → channel_id)

---

## `SKILL.md`

```markdown
---
name: {{SKILL_NAME}}
description: >-
  {{PUSHY_DESCRIPTION}}
argument-hint: "<command> [args]"
---

# {{SKILL_TITLE}}

{{ONE_PARAGRAPH_SUMMARY}} — all via the co-located `{{SKILL_NAME}}` CLI.

## Commands

| Command | Purpose | Input |
|---------|---------|-------|
| `{{CMD_1}}` | {{PURPOSE_1}} | {{INPUT_1}} |
| `{{CMD_N}}` | {{PURPOSE_N}} | {{INPUT_N}} |

## Cookbook

| Command | File | Use When |
|---------|------|----------|
| `{{CMD_1}}` | `cookbook/{{CMD_1}}.md` | {{USE_WHEN_1}} |
| `{{CMD_N}}` | `cookbook/{{CMD_N}}.md` | {{USE_WHEN_N}} |

Read the matching cookbook file first, then execute the steps.

## CLI

All commands use the co-located CLI at `scripts/{{SKILL_NAME}}` (relative to this skill's directory).
The CLI reads `{{ENV_VAR}}` from `.env`. See `references/setup.md` for setup.

## CLI Commands Reference

```
{{SKILL_NAME}} {{CMD_1}} [args]
{{SKILL_NAME}} {{CMD_N}} [args]
```

All output is JSON on stdout. Errors are JSON on stderr: `{"error": "...", "code": N}`.

**Exit codes:** `0` success, `1` unexpected, `2` input validation, `3` auth/API.
```

---

## `scripts/{{SKILL_NAME}}` (main entrypoint)

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# shellcheck source=lib/env.sh
source "$SCRIPT_DIR/lib/env.sh"
# shellcheck source=lib/api.sh
source "$SCRIPT_DIR/lib/api.sh"

{{SKILL_NAME}}_env_init || exit $?

COMMAND="${1:-}"
shift 2>/dev/null || true

emit_error() {
  local msg="$1"
  local code="${2:-1}"
  printf '{"error": %s, "code": %d}\n' "$(printf '%s' "$msg" | jq -Rs .)" "$code" >&2
  exit "$code"
}

case "$COMMAND" in
  {{CMD_1}})  source "$SCRIPT_DIR/commands/{{CMD_1}}.sh" ;;
  {{CMD_N}})  source "$SCRIPT_DIR/commands/{{CMD_N}}.sh" ;;
  "" | --help | -h)
    cat >&2 <<'USAGE'
Usage: {{SKILL_NAME}} <command> [args]

Commands:
  {{CMD_1}} [args]   {{PURPOSE_1}}
  {{CMD_N}} [args]   {{PURPOSE_N}}
USAGE
    exit 2
    ;;
  *)
    emit_error "Unknown command: $COMMAND" 2
    ;;
esac
```

---

## `scripts/lib/env.sh`

```bash
#!/usr/bin/env bash
# Environment initialization for {{SKILL_NAME}} CLI.

{{SKILL_NAME}}_env_init() {
  # Load .env from workspace root if present.
  local workspace_env
  workspace_env="$(_find_workspace_env)"
  if [[ -n "$workspace_env" && -f "$workspace_env" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$workspace_env"
    set +a
  fi

  if [[ -z "${{{ENV_VAR}}:-}" ]]; then
    printf '{"error": "%s environment variable is required", "code": 3}\n' "{{ENV_VAR}}" >&2
    return 3
  fi

  return 0
}

_find_workspace_env() {
  # Walk up from $PWD looking for a .env (up to 5 levels).
  local dir="$PWD"
  for _ in 1 2 3 4 5; do
    if [[ -f "$dir/.env" ]]; then
      printf '%s/.env' "$dir"
      return
    fi
    dir="$(dirname "$dir")"
    [[ "$dir" == "/" ]] && break
  done
}
```

---

## `scripts/lib/api.sh`

```bash
#!/usr/bin/env bash
# HTTP helpers for {{SKILL_NAME}} — curl + jq wrappers.

BASE_URL="{{BASE_URL}}"

{{SKILL_NAME}}_api_get() {
  local path="$1"
  local response
  local http_code

  response=$(curl -sS -w '\n%{http_code}' \
    -H "Authorization: Bearer ${{{ENV_VAR}}}" \
    -H "Accept: application/json" \
    "${BASE_URL}${path}")

  http_code="${response##*$'\n'}"
  response="${response%$'\n'*}"

  if [[ "$http_code" == "401" || "$http_code" == "403" ]]; then
    emit_error "Authentication failed — check {{ENV_VAR}}" 3
  elif [[ "$http_code" -ge 400 ]]; then
    emit_error "HTTP $http_code: $response" 3
  fi

  printf '%s' "$response"
}

{{SKILL_NAME}}_api_post() {
  local path="$1"
  local body="$2"
  local response
  local http_code

  response=$(curl -sS -w '\n%{http_code}' -X POST \
    -H "Authorization: Bearer ${{{ENV_VAR}}}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d "$body" \
    "${BASE_URL}${path}")

  http_code="${response##*$'\n'}"
  response="${response%$'\n'*}"

  if [[ "$http_code" == "401" || "$http_code" == "403" ]]; then
    emit_error "Authentication failed — check {{ENV_VAR}}" 3
  elif [[ "$http_code" -ge 400 ]]; then
    emit_error "HTTP $http_code: $response" 3
  fi

  printf '%s' "$response"
}
```

---

## `scripts/commands/{{command}}.sh` (working template)

Fill this in with the real call when you know the endpoint. Leave the stubbed version only when the request/response shape is genuinely unknown — and in that case name the uncertainty in the error message.

```bash
#!/usr/bin/env bash
# {{COMMAND}} — {{PURPOSE}}

ID="${1:-}"
if [[ -z "$ID" ]]; then
  emit_error "Usage: {{SKILL_NAME}} {{COMMAND}} <id>" 2
fi

result=$({{SKILL_NAME}}_api_get "/{{PRIMARY_PATH}}/$ID")
printf '%s\n' "$result" | jq '.'
```

If the endpoint or response shape is genuinely unknown at scaffold time, the stub form is:

```bash
#!/usr/bin/env bash
# {{COMMAND}} — {{PURPOSE}}
# TODO: unknown endpoint path for {{COMMAND}} — ask the user before wiring
emit_error "not implemented: {{COMMAND}} (endpoint unknown)" 1
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

```bash
scripts/{{SKILL_NAME}} {{VERIFY_COMMAND}}
```

If the env var is missing, the CLI exits with code 3 and a JSON error:
```json
{"error": "{{ENV_VAR}} environment variable is required", "code": 3}
```

## Runtime

- **Runtime:** Bash (requires `curl` and `jq`)
- **Dependencies:** `jq` (usually pre-installed on macOS via brew, Linux via package manager)
- **Rate limit:** {{RATE_LIMIT_DESCRIPTION}}
```

---

## Cookbook File Template

Same as bun-template.md — Reference Loading, Workflow, Red Flags. Replace `bun run src/cli.ts` with `scripts/{{SKILL_NAME}}` in example commands.

---

## Substitution Checklist

After writing, grep for leftover placeholders and make the entrypoint executable:

```bash
grep -r '{{' <skill-path> && echo "MISSED PLACEHOLDERS" || echo "clean"
chmod +x <skill-path>/scripts/{{SKILL_NAME}}
```
