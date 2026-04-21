#!/usr/bin/env node
/**
 * solve.mjs — Complete reCAPTCHA v2 solver (standalone, CDP-only)
 *
 * Usage: node solve.mjs [--port 9222] [--max-attempts 3] [--verbose]
 *
 * Pipeline: checkbox click → auto-pass check → audio solve → verify
 * Outputs JSON to stdout: { success, method, timeMs, transcript?, error? }
 *
 * Requirements: Node >= 22 (built-in WebSocket), ffmpeg
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

// ─── Parse arguments ───

const args = process.argv.slice(2);
let CDP_PORT = 9222;
let MAX_ATTEMPTS = 3;
let VERBOSE = false;

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--port' || args[i] === '-p') && args[i + 1]) CDP_PORT = parseInt(args[i + 1]);
  if ((args[i] === '--max-attempts' || args[i] === '-n') && args[i + 1]) MAX_ATTEMPTS = parseInt(args[i + 1]);
  if (args[i] === '--verbose' || args[i] === '-v') VERBOSE = true;
}

const DEBUG_DIR = '/tmp/captcha-solve';
try { execSync(`mkdir -p ${DEBUG_DIR}`, { stdio: 'ignore' }); } catch {}

const log = (msg) => { if (VERBOSE) console.error(`[solve] ${msg}`); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function pollFor(fn, { interval = 500, timeout = 10000, label = 'condition' } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const val = await fn();
    if (val) { log(`${label} met after ${Date.now() - start}ms`); return val; }
    await sleep(interval);
  }
  log(`${label} timed out after ${timeout}ms`);
  return false;
}

// ─── CDP connection ───

async function connectCDP(port) {
  const resp = await fetch(`http://127.0.0.1:${port}/json/version`);
  const { webSocketDebuggerUrl } = await resp.json();
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = () => reject(new Error('WebSocket connection failed'));
  });

  let msgId = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };

  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 15000);
      pending.set(id, (msg) => {
        clearTimeout(timeout);
        if (msg.error) reject(new Error(`CDP error: ${msg.error.message}`));
        else resolve(msg.result);
      });
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      ws.send(JSON.stringify(payload));
    });
  }

  return { ws, send, close: () => ws.close() };
}

// ─── Target helpers ───

async function attachToMainPage(cdp) {
  const { targetInfos } = await cdp.send('Target.getTargets');
  const main = targetInfos.find(t =>
    t.type === 'page' &&
    !t.url.includes('recaptcha') &&
    !t.url.includes('about:blank') &&
    !t.url.includes('google.com/recaptcha')
  );
  if (!main) throw new Error('No main page target found');

  const { sessionId } = await cdp.send('Target.attachToTarget', {
    targetId: main.targetId, flatten: true,
  });
  await cdp.send('Runtime.enable', {}, sessionId);
  return sessionId;
}

async function evalInBframe(cdp, expression) {
  const { targetInfos } = await cdp.send('Target.getTargets');
  const bframe = targetInfos.find(t => t.url.includes('bframe'));
  if (!bframe) throw new Error('No bframe target found');

  const { sessionId } = await cdp.send('Target.attachToTarget', {
    targetId: bframe.targetId, flatten: true,
  });

  try {
    await cdp.send('Runtime.enable', {}, sessionId);
    const result = await cdp.send('Runtime.evaluate', {
      expression, returnByValue: true,
    }, sessionId);
    if (result.exceptionDetails) {
      throw new Error(`Eval error: ${result.exceptionDetails.text}`);
    }
    return result.result?.value;
  } finally {
    try { await cdp.send('Target.detachFromTarget', { sessionId }); } catch {}
  }
}

async function clickInAnchorFrame(cdp) {
  const { targetInfos } = await cdp.send('Target.getTargets');
  const anchor = targetInfos.find(t =>
    t.url.includes('recaptcha') && t.url.includes('anchor')
  );
  if (!anchor) return false;

  const { sessionId } = await cdp.send('Target.attachToTarget', {
    targetId: anchor.targetId, flatten: true,
  });

  try {
    await cdp.send('Runtime.enable', {}, sessionId);
    const json = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.querySelector('.recaptcha-checkbox-border')
                || document.querySelector('#recaptcha-anchor');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return null;
        return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
      })()`,
      returnByValue: true,
    }, sessionId);

    const val = json.result?.value;
    if (!val) return false;
    const { x, y } = JSON.parse(val);

    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', x: Math.round(x), y: Math.round(y),
      button: 'left', clickCount: 1,
    }, sessionId);
    await sleep(50);
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x: Math.round(x), y: Math.round(y),
      button: 'left', clickCount: 1,
    }, sessionId);

    log(`Clicked checkbox in anchor frame at (${Math.round(x)}, ${Math.round(y)})`);
    return true;
  } finally {
    try { await cdp.send('Target.detachFromTarget', { sessionId }); } catch {}
  }
}

// ─── Mouse helper ───

async function clickAt(cdp, session, x, y) {
  const cx = Math.round(x);
  const cy = Math.round(y);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1,
  }, session);
  await sleep(50);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1,
  }, session);
}

// ─── Download ───

async function downloadFile(url, outputPath) {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      log(`Download HTTP ${resp.status}`);
      return false;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 100) return false;
    writeFileSync(outputPath, buf);
    log(`Downloaded ${buf.length} bytes`);
    return true;
  } catch (e) {
    log(`Download failed: ${e.message}`);
    return false;
  }
}

// ─── Transcription ───

function convertToWav(audioPath) {
  const wavPath = audioPath.replace('.mp3', '.wav');
  try {
    execSync(`ffmpeg -i ${JSON.stringify(audioPath)} -ar 16000 -ac 1 -y ${JSON.stringify(wavPath)} 2>/dev/null`, { timeout: 10000 });
    return wavPath;
  } catch {
    log('ffmpeg conversion failed');
    return null;
  }
}

async function transcribeGoogleSpeech(audioPath) {
  const wavPath = convertToWav(audioPath);
  const actualPath = (wavPath && existsSync(wavPath)) ? wavPath : audioPath;
  const audioData = readFileSync(actualPath);
  const sampleRate = actualPath.endsWith('.wav') ? 16000 : 44100;

  const url = 'http://www.google.com/speech-api/v2/recognize'
    + '?client=chromium&lang=en-US&key=AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw&pFilter=0';
  const contentType = actualPath.endsWith('.wav')
    ? `audio/l16; rate=${sampleRate}`
    : `audio/mpeg; rate=${sampleRate}`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: audioData,
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      log(`Google Speech HTTP ${resp.status}`);
      return '';
    }
    const text = await resp.text();
    const lines = text.split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        const alt = parsed.result?.[0]?.alternative?.[0];
        if (alt?.transcript) return alt.transcript;
      } catch {}
    }
  } catch (e) {
    log(`Google Speech failed: ${e.message}`);
  }
  return '';
}

async function transcribeWhisper(audioPath) {
  if (!process.env.OPENAI_API_KEY) return '';

  const audioData = readFileSync(audioPath);
  const filename = audioPath.endsWith('.wav') ? 'audio.wav' : 'audio.mp3';

  const form = new FormData();
  form.append('file', new Blob([audioData]), filename);
  form.append('model', 'whisper-1');

  try {
    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(30000),
    });
    if (!resp.ok) {
      log(`Whisper HTTP ${resp.status}`);
      return '';
    }
    const data = await resp.json();
    return data.text || '';
  } catch (e) {
    log(`Whisper failed: ${e.message}`);
    return '';
  }
}

async function transcribeAudio(audioPath) {
  const google = await transcribeGoogleSpeech(audioPath);
  if (google) return google;

  const whisper = await transcribeWhisper(audioPath);
  if (whisper) return whisper;

  return '';
}

// ─── Pipeline steps ───

async function getCheckboxBounds(cdp, mainSession) {
  const json = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const f = document.querySelector('iframe[src*="anchor"]')
             || document.querySelector('iframe[title*="reCAPTCHA"]');
      if (!f) return null;
      const r = f.getBoundingClientRect();
      if (r.width === 0) return null;
      return JSON.stringify({ x: r.x, y: r.y, width: r.width, height: r.height });
    })()`,
    returnByValue: true,
  }, mainSession);
  const val = json.result?.value;
  return val ? JSON.parse(val) : null;
}

async function checkToken(cdp, mainSession, { akamaiMode = false } = {}) {
  // Layer 1: Check for token in main page DOM (standard reCAPTCHA)
  try {
    const json = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const t = document.querySelector('#g-recaptcha-response, textarea[name="g-recaptcha-response"]');
        return !!(t && t.value && t.value.length > 10);
      })()`,
      returnByValue: true,
    }, mainSession);
    if (json.result?.value) return true;
  } catch (e) {
    // In Akamai mode, a stale session means the page navigated away from the
    // challenge — that IS success. Fall through to Layer 2 to confirm.
    if (akamaiMode) {
      log(`Layer 1 threw (expected after Akamai navigation): ${e.message}`);
    } else {
      throw e;
    }
  }

  // Layer 2: Akamai mode — detect post-submit navigation by frame disappearance
  if (akamaiMode) {
    const { targetInfos } = await cdp.send('Target.getTargets');
    const hasRecaptchaFrames = targetInfos.some(t =>
      t.url.includes('recaptcha') && (t.url.includes('anchor') || t.url.includes('bframe'))
    );
    if (!hasRecaptchaFrames) {
      log('Akamai post-submit detected: reCAPTCHA frames gone');
      return true;
    }
  }

  return false;
}

async function switchToAudioChallenge(cdp) {
  const info = await evalInBframe(cdp, `(() => {
    const audio = document.querySelector('audio');
    const dlLink = document.querySelector('.rc-audiochallenge-tdownload-link');
    const audioBtn = document.querySelector('#recaptcha-audio-button');
    const denied = document.querySelector('.rc-doscaptcha-header');
    return JSON.stringify({
      hasAudio: !!(audio || dlLink),
      hasAudioButton: !!audioBtn,
      rateLimited: !!denied,
    });
  })()`);
  const parsed = JSON.parse(info);

  if (parsed.rateLimited) throw new Error('rate_limited');

  if (parsed.hasAudio) {
    log('Audio challenge already showing');
    return;
  }

  if (parsed.hasAudioButton) {
    log('Clicking audio button...');
    await evalInBframe(cdp, `document.querySelector('#recaptcha-audio-button').click()`);
    await sleep(2000);
    return;
  }

  throw new Error('No audio challenge available');
}

async function extractAudioUrl(cdp) {
  const info = await evalInBframe(cdp, `(() => {
    const dlLink = document.querySelector('.rc-audiochallenge-tdownload-link');
    const audio = document.querySelector('audio');
    return JSON.stringify({
      dlLink: dlLink ? dlLink.href : null,
      audioSrc: audio ? audio.src : null,
    });
  })()`);
  const parsed = JSON.parse(info);
  return parsed.dlLink || parsed.audioSrc || null;
}

async function typeAnswerAndVerify(cdp, transcript) {
  await evalInBframe(cdp, `(() => {
    const input = document.querySelector('#audio-response');
    if (!input) throw new Error('No audio input');
    input.value = ${JSON.stringify(transcript)};
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);

  await sleep(500);

  await evalInBframe(cdp, `(() => {
    const btn = document.querySelector('#recaptcha-verify-button');
    if (btn) btn.click();
  })()`);
}

async function checkBframeError(cdp) {
  try {
    return await evalInBframe(cdp, `(() => {
      const denied = document.querySelector('.rc-doscaptcha-header');
      if (denied) return 'rate_limited';
      const audioErr = document.querySelector('.rc-audiochallenge-error-message');
      if (audioErr && audioErr.offsetParent !== null) return 'audio_error';
      return null;
    })()`);
  } catch { return null; }
}

// ─── Main ───

async function main() {
  const startTime = Date.now();
  const result = (obj) => {
    obj.timeMs = Date.now() - startTime;
    console.log(JSON.stringify(obj));
  };

  log(`Connecting to CDP port ${CDP_PORT}...`);
  let cdp;
  try {
    cdp = await connectCDP(CDP_PORT);
  } catch (e) {
    result({ success: false, error: `CDP connection failed: ${e.message}` });
    return;
  }

  let mainSession;
  try {
    mainSession = await attachToMainPage(cdp);
  } catch (e) {
    result({ success: false, error: `No main page: ${e.message}` });
    cdp.close();
    return;
  }

  try {
    // ── Step 1: Click checkbox ──
    log('Step 1: Finding checkbox...');
    const bounds = await getCheckboxBounds(cdp, mainSession);
    let akamaiMode = false;

    if (bounds) {
      // Standard path — checkbox visible in main page
      const clickX = bounds.x + 28;
      const clickY = bounds.y + bounds.height / 2;
      log(`Clicking checkbox at (${clickX}, ${clickY})`);
      await clickAt(cdp, mainSession, clickX, clickY);
    } else {
      // Nested iframe fallback (Akamai-wrapped reCAPTCHA)
      log('No checkbox in main page, trying anchor frame...');
      const clicked = await clickInAnchorFrame(cdp);
      if (clicked) {
        akamaiMode = true;
        log('Clicked checkbox via anchor frame (akamaiMode=true)');
      } else {
        // No checkbox anywhere — check if already solved
        if (await checkToken(cdp, mainSession)) {
          result({ success: true, method: 'already-solved' });
          return;
        }
        result({ success: false, error: 'No checkbox iframe found' });
        return;
      }
    }

    // ── Step 2: Auto-pass check ──
    const autoPass = await pollFor(
      () => checkToken(cdp, mainSession, { akamaiMode }),
      { interval: 500, timeout: 8000, label: 'auto-pass' }
    );
    if (autoPass) {
      result({ success: true, method: 'auto-pass' });
      return;
    }
    log('No auto-pass — challenge appeared');

    // ── Step 3: Audio solve attempts ──
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      log(`\n--- Audio attempt ${attempt}/${MAX_ATTEMPTS} ---`);

      try {
        // Switch to audio challenge if needed
        await switchToAudioChallenge(cdp);

        // Extract audio URL
        const audioUrl = await extractAudioUrl(cdp);
        if (!audioUrl) {
          log('No audio URL, retrying...');
          await sleep(2000);
          continue;
        }
        log(`Audio URL: ${audioUrl.substring(0, 80)}...`);

        // Download
        const audioPath = `${DEBUG_DIR}/audio-${Date.now()}.mp3`;
        const ok = await downloadFile(audioUrl, audioPath);
        if (!ok) {
          log('Download failed');
          continue;
        }

        // Transcribe
        log('Transcribing...');
        const transcript = await transcribeAudio(audioPath);
        log(`Transcript: "${transcript}"`);
        if (!transcript) {
          log('Empty transcript');
          continue;
        }

        // Type and verify
        log('Typing answer and clicking verify...');
        await typeAnswerAndVerify(cdp, transcript);

        // Poll for token instead of fixed wait
        const solved = await pollFor(
          () => checkToken(cdp, mainSession, { akamaiMode }),
          { interval: 500, timeout: 10000, label: 'post-verify' }
        );
        if (solved) {
          log('SOLVED!');
          result({ success: true, method: 'audio', transcript, attempt });
          return;
        }

        // Check for errors
        const error = await checkBframeError(cdp);
        if (error === 'rate_limited') {
          log('Rate limited — stopping');
          result({ success: false, method: 'audio', error: 'rate_limited', attempt });
          return;
        }

        log('Verify failed');
      } catch (e) {
        if (e.message === 'rate_limited') {
          result({ success: false, method: 'audio', error: 'rate_limited', attempt });
          return;
        }
        log(`Attempt error: ${e.message}`);
      }

      // Delay between attempts (reCAPTCHA rate-limits rapid retries)
      if (attempt < MAX_ATTEMPTS) {
        const delay = 15000 + Math.random() * 5000;
        log(`Waiting ${Math.round(delay / 1000)}s before retry...`);
        await sleep(delay);
      }
    }

    result({ success: false, method: 'audio', error: `Failed after ${MAX_ATTEMPTS} attempts` });

  } finally {
    cdp.close();
  }
}

main().catch(err => {
  console.log(JSON.stringify({ success: false, error: err.message, timeMs: 0 }));
  process.exit(1);
});
