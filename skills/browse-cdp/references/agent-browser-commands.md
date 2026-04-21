# agent-browser Command Reference

agent-browser is a Vercel CLI tool that connects to Chrome via CDP WebSocket and sends automation commands. It returns accessibility tree snapshots with labeled element handles (`@e7`, `@e8`) that can be targeted for clicks and fills.

## Core Commands

```bash
# Navigate to a URL
agent-browser --cdp ${CDP_PORT} open "https://example.com"

# Interactive elements only (fast, use this most of the time)
agent-browser --cdp ${CDP_PORT} snapshot -i

# Full accessibility tree (includes text, tables, all content)
agent-browser --cdp ${CDP_PORT} snapshot

# Fill a form field by element ref
agent-browser --cdp ${CDP_PORT} fill @e7 "search term"

# Click a button/link by element ref
agent-browser --cdp ${CDP_PORT} click @e8

# Take a screenshot (use only when visual context needed — burns tokens)
agent-browser --cdp ${CDP_PORT} screenshot

# Run JavaScript on the page (escape hatch)
agent-browser --cdp ${CDP_PORT} eval "document.title"

# Wait for page to settle after navigation
agent-browser --cdp ${CDP_PORT} wait 3
```

## Interaction Fallback Ladder

Not all sites work with `@ref` selectors in CDP mode. When `@ref` fails, escalate:

### Level 1: Accessibility Refs (default)

```bash
agent-browser --cdp ${CDP_PORT} snapshot -i
# Output: textbox "Search" [@e7]  button "Submit" [@e8]
agent-browser --cdp ${CDP_PORT} fill @e7 "business name"
agent-browser --cdp ${CDP_PORT} click @e8
```

### Level 2: CSS Selectors

When `@ref` times out or targets the wrong element:

```bash
agent-browser --cdp ${CDP_PORT} fill "#searchInput" "business name"
agent-browser --cdp ${CDP_PORT} click "button:has-text('Search')"
agent-browser --cdp ${CDP_PORT} click "[aria-label='Execute search']"
```

### Level 3: JavaScript eval

When CSS selectors don't work (Angular/React SPAs, hidden fields, event binding):

```bash
# Fill a field and trigger its change event
agent-browser --cdp ${CDP_PORT} eval "document.querySelector('#field').value = 'value'; document.querySelector('#field').dispatchEvent(new Event('input', {bubbles: true}))"

# Click a button
agent-browser --cdp ${CDP_PORT} eval "document.querySelector('#btnSearch').click()"

# Read text content
agent-browser --cdp ${CDP_PORT} eval "document.querySelector('.results-table').innerText"

# Execute reCAPTCHA v3 token (for invisible CAPTCHAs)
agent-browser --cdp ${CDP_PORT} eval "grecaptcha.ready(() => grecaptcha.execute('SITEKEY', {action: 'search'}).then(t => document.querySelector('#recaptcha').value = t))"
```

### Level 4: Raw CDP Script

For truly broken flows (cross-origin iframes, OOPIF attachment). The CAPTCHA solvers use this level.

## Key Patterns

### Always snapshot after every action

Don't guess what happened — look:

```bash
agent-browser --cdp ${CDP_PORT} click @e8
agent-browser --cdp ${CDP_PORT} snapshot -i    # See what changed
```

### Snapshot for reading, screenshot for seeing

- **Snapshot**: structured text, cheap, fast. Use for form fields, buttons, tables, text content.
- **Screenshot**: image, expensive (vision tokens). Use only for CAPTCHAs, visual layout, or debugging.

### Wait for dynamic content

SPAs and AJAX-heavy sites may not update immediately after a click:

```bash
agent-browser --cdp ${CDP_PORT} click @e8
agent-browser --cdp ${CDP_PORT} wait 3
agent-browser --cdp ${CDP_PORT} snapshot
```
