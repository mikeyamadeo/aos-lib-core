# Safety Template — for skills with mutating commands

When a scaffolded skill has any `update-*`, `delete-*`, or `send-*` commands (or anything that changes state on the remote side), copy this content into the generated skill at `references/safety.md` with `{{PLACEHOLDERS}}` substituted.

## Template: `references/safety.md`

```markdown
# Remote-First Safety

Every command that writes to {{SERVICE_NAME}} follows the same contract: validate, draft+confirm, execute.

## 4-Step Contract

1. **Validate** — Run the auth check (e.g., `{{SKILL_NAME}} {{VERIFY_COMMAND}}`). Fail fast if the token is missing or invalid.
2. **Draft** — Show the user exactly what will be sent / changed / deleted. Include target ID, before/after values, and any dependent effects.
3. **Confirm** — Wait for the user to approve. Nothing touches {{SERVICE_NAME}} until they say yes.
4. **Execute** — Run the CLI write command. Report the outcome (including any returned ID or updated fields).

## Failure Semantics

| Step | What happens |
|------|-------------|
| Validate fails | Stop immediately. Nothing changed on {{SERVICE_NAME}}. Report auth error. |
| User rejects draft | Nothing changed. Acknowledge cancellation. |
| Execute fails | Report the API error. The change may or may not have happened — if the API returned after sending, it probably did. Treat it as "unknown state" and suggest the user verify. |

Applies to: {{LIST_MUTATING_COMMANDS_HERE}}.

Does NOT apply to read-only commands (`get-*`, `list-*`, `fetch-*`).

## Why this matters

Mutating operations are hard to undo. A typo in a filter can update hundreds of records. A misaddressed message can't be recalled. The draft-and-confirm step feels slow but it's the only thing between you and a 3am Slack message apologizing for the script.

Never skip confirmation, even if the user says "just do it" — ask once more with the draft visible. If they've said "just do it" for N consecutive commands and the drafts all look safe, you can ask once per session instead of once per command.
```

## When to include this

Scaffold `references/safety.md` if the command inventory contains **any** of these verbs:

- `send` — sending a message, email, SMS, webhook
- `update`, `patch`, `edit`, `modify` — changing existing records
- `delete`, `remove`, `archive` — removing records
- `create`, `add`, `post` — when creating is non-trivial (e.g., creating a deal, not just logging an event)
- `move`, `transition`, `assign` — state changes that other systems depend on
- `upload`, `share` — publishing files

If in doubt, include it. Safety files are cheap; incidents are expensive.

## Also update the cookbook

The cookbook file for each mutating command should reference safety.md at the top:

```markdown
## Reference Loading

- **Tier 1 (load at start):** `references/setup.md`, `references/safety.md`
```

And the workflow should have explicit steps for validate → draft → confirm → execute:

```markdown
### Step 1: Validate auth
Run `{{SKILL_NAME}} {{VERIFY_COMMAND}}`. If it fails, stop and report.

### Step 2: Draft the change
Build the update. Show the user:
- Target: {{RECORD_TYPE}} {{id}}
- Change: {{field}}: {{old_value}} → {{new_value}}
- Side effects: {{what_else_updates}}

### Step 3: Confirm
Ask explicitly: "Proceed?" Wait for yes/no.

### Step 4: Execute
Run the CLI command. Report the result.
```
