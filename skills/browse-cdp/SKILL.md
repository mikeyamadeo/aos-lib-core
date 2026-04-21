---
name: browse-cdp
description: >-
  Use when you need to navigate a website via browser automation — filling forms,
  clicking buttons, extracting data from pages, or handling CAPTCHAs. Triggers:
  "browse to", "navigate to", "open this URL", "fill out the form", "extract from
  this page", "search this portal", browser automation, CDP, web scraping,
  CAPTCHA solving, site navigation. Do NOT use for sites that have APIs — prefer
  direct API calls when available.
---

# Browse CDP

Navigate websites using real Chrome via Chrome DevTools Protocol. Uses agent-browser for accessibility-tree-based interaction, with bundled CAPTCHA solvers for reCAPTCHA v2 and Cloudflare Turnstile handling.

## Prerequisites

- **Google Chrome** — real binary, not Chromium (authentic TLS fingerprint)
- **agent-browser** — `npm install -g agent-browser` (Vercel CLI, connects via CDP)
- **Node >= 22.4** — built-in WebSocket for CAPTCHA solvers
- **ffmpeg** — for audio CAPTCHA solver (optional, degrades gracefully)
- **ANTHROPIC_API_KEY** — for vision CAPTCHA solver fallback (optional)

## Phase 1: Pre-flight

Check if Chrome is already running on a CDP port:

```bash
curl -s --max-time 2 http://localhost:${CDP_PORT:-9222}/json/version
```

If it responds, reuse the existing session. If not, clean up any zombie instances from prior sessions, then start Chrome:

```bash
source .claude/skills/browse-cdp/scripts/chrome-cdp.sh
chrome_cdp_cleanup
chrome_cdp_start
```

After start, `$CDP_PORT` and `$CDP_FLAG` are set. Set a session name to isolate @ref mappings from other agents that may be running concurrently:

```bash
export CDP_SESSION="browse-$$"
```

Verify connectivity:

```bash
agent-browser --session ${CDP_SESSION} --cdp ${CDP_PORT} snapshot
```

Use `--session ${CDP_SESSION} --cdp ${CDP_PORT}` on every agent-browser command for the rest of this session. The session isolates your @ref namespace — without it, parallel agents on different CDP ports corrupt each other's refs.

### Degradation

| Missing | Result |
|---------|--------|
| Chrome not installed | Report `no_chrome`, stop |
| agent-browser not installed | Report `no_agent_browser`, stop |
| ffmpeg not installed | Audio CAPTCHA solver unavailable, vision fallback only |
| ANTHROPIC_API_KEY not set | Vision CAPTCHA solver unavailable, audio only |

## Phase 2: Navigate + Interact

### Core Loop

1. Navigate to the target URL:
   ```bash
   agent-browser --session ${CDP_SESSION} --cdp ${CDP_PORT} open "https://example.com"
   ```

2. Take an accessibility snapshot (interactive elements only):
   ```bash
   agent-browser --session ${CDP_SESSION} --cdp ${CDP_PORT} snapshot -i
   ```

3. Read the snapshot. Decide what to do:
   - Form field visible → fill it
   - Button/link visible → click it
   - Results visible → extract data
   - CAPTCHA detected → go to Phase 3
   - WAF block page → handle per Phase 3
   - Target data found → return results

4. **Always snapshot after every action** to see what changed.

5. Repeat until the task is complete or you're stuck.

### Interaction Strategy

Use `snapshot` to **read** the page (it's reliable), then `eval` to **act** on it (it's reliable too). The `@ref` selectors from snapshots are useful for identifying elements, but unreliable for interacting with them — they suffer from global state conflicts across Chrome instances, cross-state SPA navigation bugs, and overlay blocking.

**Default approach — snapshot to read, eval to act:**

1. Take a snapshot to understand the page structure:
```bash
agent-browser --session ${CDP_SESSION} --cdp ${CDP_PORT} snapshot -i
```

2. Identify the element you need (input field, button, etc.) from the snapshot text.

3. Use `eval` to interact — fill fields and click buttons via JavaScript:
```bash
agent-browser --session ${CDP_SESSION} --cdp ${CDP_PORT} eval "document.querySelector('#searchInput').value = 'search term'; document.querySelector('#searchInput').dispatchEvent(new Event('input', {bubbles: true}))"
agent-browser --session ${CDP_SESSION} --cdp ${CDP_PORT} eval "document.querySelector('#btnSearch').click()"
```

4. Snapshot again to see what changed.

**When you don't know the CSS selector**, use the snapshot to find it. Look for element IDs, names, or classes in the full (non `-i`) snapshot. If the page has no stable selectors, fall back to XPath or positional queries via eval.

**`@ref` as an optimization:** On simple, single-tab pages with no SPA framework, `@ref` fill/click can work and is more concise. Try it if you want, but switch to eval at the first failure — don't debug `@ref` issues.

```bash
agent-browser --session ${CDP_SESSION} --cdp ${CDP_PORT} snapshot -i
agent-browser --session ${CDP_SESSION} --cdp ${CDP_PORT} fill @e7 "search term"
agent-browser --session ${CDP_SESSION} --cdp ${CDP_PORT} click @e8
```

**Known `@ref` failure modes** (all resolved by using eval instead):
- "Unsupported token @eN" — global state conflict when multiple Chrome instances exist. Mitigated by `--session` but not eliminated.
- Cross-state navigation — SPA framework (e.g., Tyler Technologies) routes the action to another state's portal
- "Blocked by another element" — overlay or modal intercepts the click

**Raw CDP script** (for truly broken flows):
The CAPTCHA solvers operate at this level. For other cases, write a minimal Node script that connects to `ws://localhost:${CDP_PORT}` directly.

See `references/agent-browser-commands.md` for the full command cookbook.

### Key Principles

- **Snapshots over screenshots.** Accessibility tree is structured text — cheap, fast, and gives element labels. Screenshots burn vision tokens. Use screenshots only for CAPTCHAs or visual debugging.
- **Wait for dynamic content.** After clicking, wait 2-3 seconds for SPAs to update:
  ```bash
  agent-browser --session ${CDP_SESSION} --cdp ${CDP_PORT} click @e8
  agent-browser --session ${CDP_SESSION} --cdp ${CDP_PORT} wait 3
  agent-browser --session ${CDP_SESSION} --cdp ${CDP_PORT} snapshot -i
  ```
- **Read the full snapshot first.** Don't guess at element structure — the snapshot tells you what's there.

## Phase 3: CAPTCHA + WAF Handling

### Supported Challenges

| Type | Detection | Action |
|------|-----------|--------|
| **reCAPTCHA v2** | iframe with "reCAPTCHA" in title, "I'm not a robot" checkbox | Run audio solver, then vision fallback |
| **Cloudflare Turnstile** | "Just a moment...", "Checking your browser", Cloudflare branding | Wait 8 seconds, snapshot again. Retry once. |
| **Cloudflare Managed** | "Verifying you are human..." with checkbox | Click checkbox, wait 8 seconds |
| **Simple image CAPTCHA** | `<img>` near a text input, no reCAPTCHA iframe | Screenshot image, use Claude vision to read text, type answer |

### Not Supported (Degrade Immediately)

| Type | Detection | Action |
|------|-----------|--------|
| **Akamai Bot Manager** | ERR_HTTP2_PROTOCOL_ERROR, "Access Denied", 403 | Report `waf_blocked` with URL |
| **Imperva / Incapsula** | "Incapsula incident ID", interaction crashes | Report `waf_blocked` with URL |
| **Unknown CAPTCHA** | Unrecognized challenge page | Report `captcha_blocked` with URL + screenshot |

### reCAPTCHA v2 Solver Invocation

```bash
# Audio solver (primary — needs ffmpeg; optional OPENAI_API_KEY for Whisper fallback)
node .claude/skills/browse-cdp/captcha/solve.mjs --port ${CDP_PORT} --verbose
```

Check the JSON output:
- `"success": true` → CAPTCHA solved, continue with form submission
- `"success": false` → run vision fallback:

```bash
# Vision solver (fallback — needs sharp + ANTHROPIC_API_KEY)
node .claude/skills/browse-cdp/captcha/solve-vision.mjs --port ${CDP_PORT} --verbose
```

If both fail, report `captcha_blocked` with the page URL for manual lookup.

See `references/captcha-patterns.md` for detailed recognition patterns.

## Phase 4: Cleanup

**Leave Chrome running** after completing the task — other skills may reuse the session.

Only stop Chrome when explicitly asked:

```bash
agent-browser --session ${CDP_SESSION} close
source .claude/skills/browse-cdp/scripts/chrome-cdp.sh
chrome_cdp_stop
```

To clean up zombie Chrome instances from crashed sessions:

```bash
source .claude/skills/browse-cdp/scripts/chrome-cdp.sh
chrome_cdp_cleanup
```

## Structured Failure Reasons

When browsing fails, return a structured reason the consumer can act on:

| Reason | Meaning |
|--------|---------|
| `no_chrome` | Chrome not installed |
| `no_agent_browser` | agent-browser CLI not installed |
| `captcha_blocked` | CAPTCHA present, all solvers failed |
| `waf_blocked` | WAF block (Akamai, Imperva, IP-level) |
| `timeout` | Page didn't load or action timed out |
| `portal_down` | Site returned error or maintenance page |

Always include the target URL so the consumer can offer manual fallback.
