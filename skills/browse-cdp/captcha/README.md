# CAPTCHA Solving

Bundled reCAPTCHA v2 solvers for CDP browser automation.

## Two-Step Pattern

Run audio first. If it fails, run vision as fallback:

```bash
# 1. Audio solver (primary)
node .claude/skills/browse-cdp/captcha/solve.mjs --port ${CDP_PORT} --verbose

# 2. If audio output has "success": false, run vision fallback
node .claude/skills/browse-cdp/captcha/solve-vision.mjs --port ${CDP_PORT} --verbose
```

Both scripts output JSON to stdout and are separate to keep dependency profiles clean — audio needs ffmpeg, vision needs sharp/ANTHROPIC_API_KEY.

## Audio Solver (Primary)

`solve.mjs` — standalone CDP-only audio solver.
Pipeline: checkbox click → auto-pass check → audio challenge → transcription → verification.

```bash
node solve.mjs [--port 9222] [--max-attempts 3] [--verbose]
```

Output: `{ success, method, timeMs, transcript?, error? }`

### Audio Dependencies

| Dependency | Purpose | Install |
|---|---|---|
| Node >= 22.4 | Built-in WebSocket + fetch for CDP and APIs | Already installed |
| `ffmpeg` | MP3 to WAV conversion for Google Speech | `brew install ffmpeg` |

Optional: `OPENAI_API_KEY` enables Whisper fallback if Google Speech transcription fails.

### Transcription Pipeline

1. **Google Web Speech API** (primary, free, no API key) — converts MP3→WAV via ffmpeg, POSTs to Google's endpoint
2. **OpenAI Whisper** (fallback, requires `OPENAI_API_KEY`) — sends MP3 directly via fetch, no ffmpeg needed

## Vision Solver (Fallback)

`solve-vision.mjs` — standalone CDP-only vision solver.
Pipeline: attach bframe OOPIF → screenshot grid → crop + annotate tiles → Claude Vision → click → verify.

```bash
node solve-vision.mjs [--port 9222] [--max-rounds 10] [--timeout 90000] [--verbose]
```

Output: `{ success, method: "vision", timeMs, tilesClicked, prompt?, error? }`

### Vision Dependencies

| Dependency | Purpose | Install |
|---|---|---|
| Node >= 22.4 | Built-in WebSocket for CDP | Already installed |
| `sharp` (npm) | Screenshot cropping + tile overlay | `npm install sharp` |
| `ANTHROPIC_API_KEY` | Claude Vision API for tile analysis | Set in environment |

Uses raw `fetch` to `api.anthropic.com` — no SDK dependency.
