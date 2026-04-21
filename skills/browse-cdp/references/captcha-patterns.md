# CAPTCHA Recognition Patterns

How to identify CAPTCHA types in accessibility snapshots and what to do about each one.

## reCAPTCHA v2 (Checkbox + Challenge)

### Recognition

In snapshot, look for:
- iframe with title containing "reCAPTCHA"
- Checkbox with label "I'm not a robot"
- Text mentioning "reCAPTCHA" or "recaptcha"

In page source (via eval):
- `iframe[src*="recaptcha"]` or `iframe[src*="anchor"]`
- `div.g-recaptcha` or `#g-recaptcha-response`

### Action

1. Run the audio solver:
   ```bash
   node .claude/skills/browse-cdp/captcha/solve.mjs --port ${CDP_PORT} --verbose
   ```
2. Check JSON output — if `"success": false`, run vision fallback:
   ```bash
   node .claude/skills/browse-cdp/captcha/solve-vision.mjs --port ${CDP_PORT} --verbose
   ```
3. If both fail, report `captcha_blocked` with the page URL.

### Notes
- Some sites have reCAPTCHA present but hidden (class="hide") — searches may succeed without solving
- reCAPTCHA tokens expire quickly — solve immediately before submitting the form
- Akamai-wrapped reCAPTCHA has nested iframes — the solvers handle this

## Cloudflare Turnstile

### Recognition

In snapshot, look for:
- Text: "Just a moment...", "Checking your browser", "Verify you are human"
- Cloudflare logo or branding
- Page appears to be a challenge/interstitial, not the target content

### Action

1. Wait 8 seconds — real Chrome passes Turnstile managed challenges automatically
2. Snapshot again to check if the target page loaded
3. If still blocked after 2 retries (24 seconds total), report `waf_blocked`

### Notes
- Turnstile uses behavioral analysis, not a visible puzzle — it either passes or it doesn't
- Navigating directly to the portal URL (not via redirect) reduces Turnstile triggers
- Some portals (Michigan, Ohio, Pennsylvania) consistently trigger Turnstile on first load but resolve within 5 seconds

## Cloudflare Managed Challenge

### Recognition

Same as Turnstile but may include a checkbox. The page shows Cloudflare branding and "Verifying you are human..."

### Action

Same as Turnstile — wait and retry. If a checkbox appears, click it and wait.

## Akamai Bot Manager

### Recognition

- HTTP/2 stream reset errors (`ERR_HTTP2_PROTOCOL_ERROR`)
- Block page with "Access Denied" and a reference ID
- `ERR_ABORTED` on page load
- 403 responses

### Action

This is an IP-level block, not a challenge. Stealth doesn't help.
1. Report `waf_blocked` immediately
2. Include the portal URL for manual lookup
3. Do not retry — repeated requests may escalate the block

## Imperva / Incapsula

### Recognition

- Interstitial page with "Incapsula incident ID"
- Page loads but interactions crash or redirect to a block page

### Action

Same as Akamai — degrade immediately. Report `waf_blocked` with portal URL.

## Simple Image CAPTCHA (Custom, Non-reCAPTCHA)

### Recognition

- An `<img>` element near a text input, with no reCAPTCHA iframe
- Usually distorted text in an image
- Often on older government portals

### Action

1. Screenshot the CAPTCHA image
2. Use Claude vision to read the distorted text
3. Type the text into the adjacent input field
4. Submit

This is a manual process — no bundled solver handles arbitrary image CAPTCHAs.

## No CAPTCHA Detected

If the snapshot shows normal page content (forms, search fields, results) with no challenge indicators, proceed with normal navigation. Many sites don't use CAPTCHAs at all.
