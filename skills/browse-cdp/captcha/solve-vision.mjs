#!/usr/bin/env node
/**
 * solve-vision.mjs — reCAPTCHA v2 vision solver (standalone, CDP-only)
 *
 * Usage: node solve-vision.mjs [--port 9222] [--max-rounds 10] [--timeout 90000] [--verbose]
 *
 * Pipeline: attach bframe → screenshot grid → annotate tiles → Claude Vision → click → verify
 * Outputs JSON to stdout: { success, method: "vision", timeMs, tilesClicked, prompt?, error? }
 *
 * Requirements: Node >= 22 (built-in WebSocket), sharp (npm), ANTHROPIC_API_KEY env var
 */

import { createRequire } from 'node:module';
import { writeFileSync } from 'fs';
import { execSync } from 'child_process';

// ─── Robust startup: validate deps before doing anything ───

// Resolve sharp from CWD (e.g., apps/field-agents/ which has it as a devDependency).
// We cannot use import.meta.url because sharp is not installed near this script.
const _require = createRequire(process.cwd() + '/');

let sharp;
try {
  sharp = _require('sharp');
} catch (e) {
  console.log(JSON.stringify({ success: false, method: 'vision', error: 'sharp_not_installed', timeMs: 0 }));
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.log(JSON.stringify({ success: false, method: 'vision', error: 'missing_ANTHROPIC_API_KEY', timeMs: 0 }));
  process.exit(1);
}

// ─── Process-level safety nets ───

process.on('uncaughtException', (err) => {
  console.log(JSON.stringify({ success: false, method: 'vision', error: `uncaught: ${err.message}`, timeMs: 0 }));
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.log(JSON.stringify({ success: false, method: 'vision', error: `unhandled: ${msg}`, timeMs: 0 }));
  process.exit(1);
});

// ─── Parse arguments ───

const args = process.argv.slice(2);
let CDP_PORT = 9222;
let MAX_ROUNDS = 10;
let TIMEOUT = 90000;
let VERBOSE = false;

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--port' || args[i] === '-p') && args[i + 1]) CDP_PORT = parseInt(args[i + 1]);
  if ((args[i] === '--max-rounds' || args[i] === '-n') && args[i + 1]) MAX_ROUNDS = parseInt(args[i + 1]);
  if ((args[i] === '--timeout' || args[i] === '-t') && args[i + 1]) TIMEOUT = parseInt(args[i + 1]);
  if (args[i] === '--verbose' || args[i] === '-v') VERBOSE = true;
}

const DEBUG_DIR = '/tmp/captcha-solve-vision';
try { execSync(`mkdir -p ${DEBUG_DIR}`, { stdio: 'ignore' }); } catch {}

const log = (msg) => { if (VERBOSE) console.error(`[solve-vision] ${msg}`); };
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

// ─── CDP connection (same as solve.mjs) ───

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

async function attachToBframe(cdp) {
  const { targetInfos } = await cdp.send('Target.getTargets');
  const bframe = targetInfos.find(t => t.url.includes('bframe'));
  if (!bframe) return null;

  const { sessionId } = await cdp.send('Target.attachToTarget', {
    targetId: bframe.targetId, flatten: true,
  });
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Page.enable', {}, sessionId);
  return sessionId;
}

async function detachSession(cdp, sessionId) {
  try { await cdp.send('Target.detachFromTarget', { sessionId }); } catch {}
}

// ─── Token check ───

async function checkTokenValue(cdp, mainSession) {
  try {
    const r = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const t = document.querySelector('#g-recaptcha-response, textarea[name="g-recaptcha-response"]');
        return (t && t.value && t.value.length > 10) ? t.value : '';
      })()`,
      returnByValue: true,
    }, mainSession);
    return r.result?.value || '';
  } catch {
    // Session stale (page navigated, e.g. Akamai post-solve) — check if
    // reCAPTCHA frames disappeared, which signals a successful solve.
    const { targetInfos } = await cdp.send('Target.getTargets');
    const hasRecaptchaFrames = targetInfos.some(t =>
      t.url.includes('recaptcha') && (t.url.includes('anchor') || t.url.includes('bframe'))
    );
    if (!hasRecaptchaFrames) {
      log('Token check: session stale + reCAPTCHA frames gone — likely solved');
      return '__NAVIGATION_SOLVED__';
    }
    return '';
  }
}

// ─── Bframe helpers ───

async function getDPR(cdp, bfSession) {
  const r = await cdp.send('Runtime.evaluate', {
    expression: 'window.devicePixelRatio',
    returnByValue: true,
  }, bfSession);
  return r.result?.value || 2;
}

async function extractPrompt(cdp, bfSession) {
  const r = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const selectors = [
        '.rc-imageselect-desc strong',
        '.rc-imageselect-desc-no-canonical strong',
        '#rc-imageselect strong',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent && el.textContent.trim()) return el.textContent.trim();
      }
      // Fallback: full description
      const desc = document.querySelector('.rc-imageselect-desc')
                || document.querySelector('.rc-imageselect-desc-no-canonical');
      if (desc && desc.textContent) return desc.textContent.trim();
      return '';
    })()`,
    returnByValue: true,
  }, bfSession);
  return r.result?.value || '';
}

async function getGridCells(cdp, bfSession) {
  const r = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const cells = document.querySelectorAll('#rc-imageselect-target td');
      if (cells.length === 0) return null;
      const results = [];
      for (const cell of cells) {
        const rect = cell.getBoundingClientRect();
        results.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
      }
      // Grid container
      const grid = document.querySelector('#rc-imageselect-target');
      const gr = grid ? grid.getBoundingClientRect() : null;
      return JSON.stringify({
        cells: results,
        grid: gr ? { x: gr.x, y: gr.y, width: gr.width, height: gr.height } : null,
      });
    })()`,
    returnByValue: true,
  }, bfSession);
  const val = r.result?.value;
  if (!val) return null;
  return JSON.parse(val);
}

async function checkErrorState(cdp, bfSession) {
  const r = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const checks = [
        { sel: '.rc-imageselect-error-select-more', name: 'select_more' },
        { sel: '.rc-imageselect-error-dynamic-more', name: 'dynamic_more' },
        { sel: '.rc-imageselect-incorrect-response', name: 'incorrect' },
      ];
      for (const c of checks) {
        const el = document.querySelector(c.sel);
        if (el && el.offsetParent !== null) return c.name;
      }
      return '';
    })()`,
    returnByValue: true,
  }, bfSession);
  return r.result?.value || '';
}

async function clickVerifyButton(cdp, bfSession) {
  return cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('#recaptcha-verify-button');
      if (btn) { btn.click(); return true; }
      return false;
    })()`,
    returnByValue: true,
  }, bfSession);
}

async function clickTile(cdp, bfSession, index) {
  return cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const cells = document.querySelectorAll('#rc-imageselect-target td');
      if (cells[${index}]) { cells[${index}].click(); return true; }
      return false;
    })()`,
    returnByValue: true,
  }, bfSession);
}

// ─── Screenshot & annotation ───

async function screenshotBframe(cdp, bfSession) {
  const r = await cdp.send('Page.captureScreenshot', {
    format: 'png',
  }, bfSession);
  return Buffer.from(r.data, 'base64');
}

async function cropAndAnnotateGrid(fullBuffer, gridInfo, dpr) {
  const gb = gridInfo.grid;
  if (!gb || gb.width < 10 || gb.height < 10) return null;

  const cropX = Math.max(0, Math.round(gb.x * dpr));
  const cropY = Math.max(0, Math.round(gb.y * dpr));

  const meta = await sharp(fullBuffer).metadata();
  const imgW = meta.width || 1;
  const imgH = meta.height || 1;

  const cropW = Math.min(Math.round(gb.width * dpr), imgW - cropX);
  const cropH = Math.min(Math.round(gb.height * dpr), imgH - cropY);

  if (cropW < 20 || cropH < 20) return null;

  log(`Grid crop: (${cropX}, ${cropY}) ${cropW}x${cropH} from ${imgW}x${imgH}`);

  let gridBuffer = await sharp(fullBuffer)
    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    .png()
    .toBuffer();

  // Validate screenshot is not blank
  const stats = await sharp(gridBuffer).stats();
  const meanR = stats.channels[0]?.mean || 0;
  const meanG = stats.channels[1]?.mean || 0;
  const meanB = stats.channels[2]?.mean || 0;
  const avgMean = (meanR + meanG + meanB) / 3;
  if (avgMean < 5 || avgMean > 250) {
    log(`Bad screenshot: mean pixel value ${avgMean.toFixed(1)} — likely blank`);
    return null;
  }

  // Determine grid size
  const cellCount = gridInfo.cells.length;
  const n = cellCount >= 16 ? 4 : 3;

  const cellW = cropW / n;
  const cellH = cropH / n;

  // Create SVG overlay with tile numbers
  const labels = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const tileNum = row * n + col + 1;
      const cx = col * cellW + 20;
      const cy = row * cellH + 30;
      labels.push(
        `<rect x="${cx - 14}" y="${cy - 22}" width="28" height="28" rx="4" fill="rgba(0,0,0,0.7)"/>` +
        `<text x="${cx}" y="${cy}" font-size="22" font-weight="bold" fill="white" text-anchor="middle">${tileNum}</text>`
      );
    }
  }

  const svg = Buffer.from(`<svg width="${cropW}" height="${cropH}">${labels.join('')}</svg>`);

  gridBuffer = await sharp(gridBuffer)
    .composite([{ input: svg, top: 0, left: 0 }])
    .png()
    .toBuffer();

  // Save debug image
  const ts = Date.now();
  writeFileSync(`${DEBUG_DIR}/grid-${ts}.png`, gridBuffer);

  return { buffer: gridBuffer, gridSize: n === 4 ? '4x4' : '3x3', n };
}

// ─── Vision API (raw fetch, no SDK) ───

let consecutiveApiFailures = 0;

async function analyzeTiles(gridImageBuffer, prompt, gridSize) {
  const base64Image = gridImageBuffer.toString('base64');
  const n = gridSize === '3x3' ? 3 : 4;
  const totalTiles = n * n;

  const body = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 60,
    system: 'You identify objects in reCAPTCHA grid images. Each tile has a number overlay. Output ONLY a JSON array of matching tile numbers. No explanation.',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `This ${gridSize} grid has ${totalTiles} numbered tiles. Each tile has its number in the top-left corner. Which tiles contain "${prompt}"? Include tiles where the object is even partially visible. Be thorough - missing a tile fails the CAPTCHA. JSON array only.`,
          },
        ],
      },
      {
        role: 'assistant',
        content: '[',
      },
    ],
  });

  const startTime = Date.now();

  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body,
      signal: AbortSignal.timeout(30000),
    });
  } catch (e) {
    consecutiveApiFailures++;
    log(`Vision API fetch error: ${e.message} (consecutive: ${consecutiveApiFailures})`);
    return null;
  }

  if (!resp.ok) {
    consecutiveApiFailures++;
    log(`Vision API HTTP ${resp.status} (consecutive: ${consecutiveApiFailures})`);
    return null;
  }

  // Reset on success
  consecutiveApiFailures = 0;

  const data = await resp.json();
  const elapsed = Date.now() - startTime;
  const rawText = data.content?.[0]?.type === 'text' ? data.content[0].text : '';
  const text = '[' + rawText;
  log(`Vision API (${elapsed}ms): ${text}`);

  // Extract JSON array
  const match = text.match(/\[[\d,\s]*\]/);
  if (match) {
    const tiles = JSON.parse(match[0]);
    const validTiles = tiles.filter(t => t >= 1 && t <= totalTiles);
    log(`Matching tiles: ${JSON.stringify(validTiles)}`);
    return validTiles;
  }

  log('No valid tile array found in Vision response');
  return [];
}

// ─── Main pipeline ───

async function main() {
  const startTime = Date.now();
  const timeoutTimer = setTimeout(() => {
    console.log(JSON.stringify({ success: false, method: 'vision', error: 'timeout', timeMs: TIMEOUT }));
    process.exit(1);
  }, TIMEOUT);

  const result = (obj) => {
    clearTimeout(timeoutTimer);
    obj.method = 'vision';
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

  // Snapshot token at start to detect stale tokens
  const initialToken = await checkTokenValue(cdp, mainSession);
  if (initialToken) {
    log(`Initial token present (${initialToken.length} chars) — will only report success if it changes`);
  }

  function isNewToken(token) {
    if (!token) return false;
    if (token === '__NAVIGATION_SOLVED__') return true;
    if (!initialToken) return true;
    return token !== initialToken;
  }

  let totalTilesClicked = 0;
  let lastPrompt = '';

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      log(`\n--- Vision round ${round + 1}/${MAX_ROUNDS} ---`);

      // Bail if Vision API keeps failing
      if (consecutiveApiFailures >= 2) {
        result({ success: false, error: 'vision_api_failed', tilesClicked: totalTilesClicked });
        return;
      }

      // Step 1: Attach to bframe OOPIF
      let bfSession;
      try {
        bfSession = await attachToBframe(cdp);
        if (!bfSession) {
          // Bframe gone — could mean CAPTCHA was solved (page navigated)
          const token = await checkTokenValue(cdp, mainSession);
          if (isNewToken(token)) {
            log('No bframe but token present — CAPTCHA was solved');
            result({ success: true, tilesClicked: totalTilesClicked, prompt: lastPrompt });
            return;
          }
          log('No bframe found — CAPTCHA may not be showing');
          result({ success: false, error: 'no_bframe', tilesClicked: totalTilesClicked });
          return;
        }
      } catch (e) {
        log(`Bframe attach failed: ${e.message}`);
        result({ success: false, error: `bframe_attach: ${e.message}`, tilesClicked: totalTilesClicked });
        return;
      }

      try {
        // Step 2: Get DPR
        const dpr = await getDPR(cdp, bfSession);
        log(`DPR: ${dpr}`);

        // Step 3: Extract prompt
        const prompt = await extractPrompt(cdp, bfSession);
        if (!prompt) {
          log('No prompt text found — challenge may not be loaded');
          await sleep(2000);
          continue;
        }
        lastPrompt = prompt;
        log(`Prompt: "${prompt}"`);

        // Step 4: Get grid cell positions
        const gridInfo = await getGridCells(cdp, bfSession);
        if (!gridInfo || !gridInfo.cells || gridInfo.cells.length === 0) {
          log('No grid cells found');
          await sleep(2000);
          continue;
        }

        // Validate grid cell dimensions
        const firstCell = gridInfo.cells[0];
        if (firstCell.width < 10 || firstCell.height < 10) {
          log(`Grid cells too small: ${firstCell.width}x${firstCell.height} — not rendered`);
          await sleep(2000);
          continue;
        }

        log(`Grid: ${gridInfo.cells.length} cells, first cell: ${firstCell.width}x${firstCell.height}`);

        // Step 5: Screenshot full bframe
        const fullScreenshot = await screenshotBframe(cdp, bfSession);
        log(`Bframe screenshot: ${fullScreenshot.length} bytes`);

        // Step 6: Crop to grid + add numbered overlays
        const annotated = await cropAndAnnotateGrid(fullScreenshot, gridInfo, dpr);
        if (!annotated) {
          log('Failed to crop/annotate grid — bad screenshot or dimensions');
          await sleep(2000);
          continue;
        }

        // Step 7: Send to Claude Vision API
        const matchingTiles = await analyzeTiles(annotated.buffer, prompt, annotated.gridSize);
        if (matchingTiles === null) {
          // API failure — tracked by consecutiveApiFailures, loop will check
          log('Vision API call failed');
          await sleep(2000);
          continue;
        }
        if (matchingTiles.length === 0) {
          log('No matching tiles found by Vision');
          await sleep(1000);
          continue;
        }

        // Step 8: Click matching tiles via DOM .click()
        log(`Clicking ${matchingTiles.length} tiles: ${matchingTiles.join(', ')}`);
        for (const tileNum of matchingTiles) {
          const idx = tileNum - 1; // 0-indexed
          await clickTile(cdp, bfSession, idx);
          totalTilesClicked++;
          await sleep(180 + Math.random() * 220);
        }

        // Step 9: Handle dynamic tile replacement
        await sleep(1500);

        // Re-screenshot and re-analyze for dynamic tiles
        const freshScreenshot = await screenshotBframe(cdp, bfSession);
        const freshGridInfo = await getGridCells(cdp, bfSession);
        if (freshGridInfo && freshGridInfo.cells.length > 0) {
          const freshAnnotated = await cropAndAnnotateGrid(freshScreenshot, freshGridInfo, dpr);
          if (freshAnnotated) {
            const freshTiles = await analyzeTiles(freshAnnotated.buffer, prompt, freshAnnotated.gridSize);
            if (freshTiles && freshTiles.length > 0) {
              const newTiles = freshTiles.filter(t => !matchingTiles.includes(t));
              if (newTiles.length > 0) {
                log(`Dynamic: clicking ${newTiles.length} new tiles: ${newTiles.join(', ')}`);
                for (const tileNum of newTiles) {
                  await clickTile(cdp, bfSession, tileNum - 1);
                  totalTilesClicked++;
                  await sleep(180 + Math.random() * 220);
                }

                // Second dynamic round
                await sleep(1500);
                const fresh2Screenshot = await screenshotBframe(cdp, bfSession);
                const fresh2GridInfo = await getGridCells(cdp, bfSession);
                if (fresh2GridInfo && fresh2GridInfo.cells.length > 0) {
                  const fresh2Annotated = await cropAndAnnotateGrid(fresh2Screenshot, fresh2GridInfo, dpr);
                  if (fresh2Annotated) {
                    const fresh2Tiles = await analyzeTiles(fresh2Annotated.buffer, prompt, fresh2Annotated.gridSize);
                    if (fresh2Tiles && fresh2Tiles.length > 0) {
                      const allPrev = [...matchingTiles, ...newTiles];
                      const newerTiles = fresh2Tiles.filter(t => !allPrev.includes(t));
                      if (newerTiles.length > 0) {
                        log(`Dynamic round 2: clicking ${newerTiles.length} tiles: ${newerTiles.join(', ')}`);
                        for (const tileNum of newerTiles) {
                          await clickTile(cdp, bfSession, tileNum - 1);
                          totalTilesClicked++;
                          await sleep(180 + Math.random() * 220);
                        }
                        await sleep(1000);
                      }
                    }
                  }
                }
              }
            }
          }
        }

        // Step 10: Click verify button
        log('Clicking verify...');
        const verifyResult = await clickVerifyButton(cdp, bfSession);

        // Step 11: Poll for token (solved)
        const solvedToken = await pollFor(
          () => checkTokenValue(cdp, mainSession).then(t => isNewToken(t) ? t : false),
          { interval: 500, timeout: 10000, label: 'post-verify' }
        );
        if (solvedToken) {
          log('SOLVED!');
          result({ success: true, tilesClicked: totalTilesClicked, prompt: lastPrompt });
          return;
        }
        const currentToken = await checkTokenValue(cdp, mainSession);

        // Step 12: Detect error states
        const errorState = await checkErrorState(cdp, bfSession);
        if (errorState) {
          log(`Error state: ${errorState}`);
          if (errorState === 'select_more' || errorState === 'dynamic_more') {
            log('Need more tiles — continuing same challenge');
          } else if (errorState === 'incorrect') {
            log('Incorrect — new challenge will appear');
            await sleep(2000);
          }
        } else if (!currentToken) {
          // No error visible, no token — verify click may have been a no-op
          log('No state change after verify — DOM click may have failed');
          // Retry with Input.dispatchMouseEvent as fallback
          try {
            const verifyBounds = await cdp.send('Runtime.evaluate', {
              expression: `(() => {
                const btn = document.querySelector('#recaptcha-verify-button');
                if (!btn) return null;
                const r = btn.getBoundingClientRect();
                return JSON.stringify({ x: r.x + r.width/2, y: r.y + r.height/2 });
              })()`,
              returnByValue: true,
            }, bfSession);
            const vb = verifyBounds.result?.value ? JSON.parse(verifyBounds.result.value) : null;
            if (vb) {
              log(`Retrying verify via Input.dispatchMouseEvent at (${vb.x}, ${vb.y})`);
              await cdp.send('Input.dispatchMouseEvent', {
                type: 'mousePressed', x: Math.round(vb.x), y: Math.round(vb.y),
                button: 'left', clickCount: 1,
              }, bfSession);
              await sleep(50);
              await cdp.send('Input.dispatchMouseEvent', {
                type: 'mouseReleased', x: Math.round(vb.x), y: Math.round(vb.y),
                button: 'left', clickCount: 1,
              }, bfSession);
              const retryToken = await pollFor(
                () => checkTokenValue(cdp, mainSession).then(t => isNewToken(t) ? t : false),
                { interval: 500, timeout: 10000, label: 'post-verify-retry' }
              );
              if (retryToken) {
                log('SOLVED after Input.dispatchMouseEvent retry!');
                result({ success: true, tilesClicked: totalTilesClicked, prompt: lastPrompt });
                return;
              }
            }
          } catch (e) {
            log(`dispatchMouseEvent fallback failed: ${e.message}`);
          }
        }

        await sleep(500);

      } finally {
        // Step 13: Detach bframe session
        await detachSession(cdp, bfSession);
      }
    }

    result({ success: false, error: `Failed after ${MAX_ROUNDS} rounds`, tilesClicked: totalTilesClicked, prompt: lastPrompt });

  } finally {
    cdp.close();
  }
}

main().catch(err => {
  console.log(JSON.stringify({ success: false, method: 'vision', error: err.message, timeMs: 0 }));
  process.exit(1);
});
