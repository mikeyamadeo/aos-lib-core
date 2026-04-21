#!/usr/bin/env bash
# chrome-cdp.sh — Launch real Chrome with CDP for browser automation
#
# Why: Playwright-launched browsers have detectable TLS/HTTP/2 fingerprints
# that WAFs (Akamai, Cloudflare) block. Launching Chrome independently
# preserves authentic fingerprints. agent-browser connects after-the-fact
# via --cdp for automation only.
#
# Usage:
#   source chrome-cdp.sh
#   chrome_cdp_start
#   agent-browser $CDP_FLAG open "https://..."
#   agent-browser $CDP_FLAG snapshot -i
#   chrome_cdp_stop

set -euo pipefail

CDP_PORT="${CDP_PORT:-9222}"
CDP_FLAG="--cdp ${CDP_PORT}"
CDP_USER_DATA="/tmp/chrome-cdp-${CDP_PORT}"
CDP_PID=""

_find_chrome() {
  local candidates=(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    "/usr/bin/google-chrome"
    "/usr/bin/google-chrome-stable"
    "/usr/bin/chromium-browser"
    "/usr/bin/chromium"
  )
  for c in "${candidates[@]}"; do
    if [[ -x "$c" ]]; then
      echo "$c"
      return 0
    fi
  done
  echo ""
  return 1
}

chrome_cdp_start() {
  local chrome
  chrome=$(_find_chrome) || {
    echo "ERROR: Google Chrome not found." >&2
    echo "  Remedy: brew reinstall --cask google-chrome" >&2
    return 1
  }

  local version
  version=$("$chrome" --version 2>/dev/null) || {
    echo "ERROR: Chrome binary found at '$chrome' but failed to execute." >&2
    echo "  Remedy: brew reinstall --cask google-chrome" >&2
    return 1
  }
  echo "Chrome binary OK: ${version}"

  local port="${CDP_PORT}"
  local max_port=$((port + 20))
  while [[ $port -lt $max_port ]]; do
    if ! curl -s --max-time 1 "http://localhost:${port}/json/version" &>/dev/null; then
      break
    fi
    port=$((port + 1))
  done

  if [[ $port -ge $max_port ]]; then
    echo "ERROR: No free CDP port found in range ${CDP_PORT}-$((max_port - 1))." >&2
    return 1
  fi

  CDP_PORT="$port"
  CDP_FLAG="--cdp ${CDP_PORT}"
  CDP_USER_DATA="/tmp/chrome-cdp-${CDP_PORT}"

  "$chrome" \
    --remote-debugging-port="${CDP_PORT}" \
    --no-first-run \
    --no-default-browser-check \
    --user-data-dir="${CDP_USER_DATA}" \
    --window-position=-9999,-9999 \
    "about:blank" &>/dev/null &
  CDP_PID=$!

  local attempts=0
  while ! curl -s --max-time 1 "http://localhost:${CDP_PORT}/json/version" &>/dev/null; do
    sleep 1
    attempts=$((attempts + 1))
    if [[ $attempts -ge 10 ]]; then
      echo "ERROR: Chrome did not start CDP on port ${CDP_PORT} within 10s." >&2
      chrome_cdp_stop
      return 1
    fi
  done

  local actual_pid
  actual_pid=$(lsof -ti "tcp:${CDP_PORT}" 2>/dev/null | head -1) || actual_pid=""
  if [[ -n "$actual_pid" && "$actual_pid" != "$CDP_PID" ]]; then
    echo "ERROR: Port ${CDP_PORT} owned by PID ${actual_pid}, not our Chrome (PID ${CDP_PID})." >&2
    chrome_cdp_stop
    return 1
  fi

  echo "Chrome CDP ready on port ${CDP_PORT} (PID ${CDP_PID})"
}

chrome_cdp_stop() {
  if [[ -n "${CDP_PID}" ]]; then
    kill "${CDP_PID}" 2>/dev/null || true
    sleep 1
    kill -0 "${CDP_PID}" 2>/dev/null && kill -9 "${CDP_PID}" 2>/dev/null || true
    CDP_PID=""
  fi
  rm -rf "${CDP_USER_DATA}" 2>/dev/null || true
  echo "Chrome CDP stopped."
}

chrome_cdp_cleanup() {
  local port
  for port in $(seq 9222 9241); do
    if curl -s --max-time 1 "http://localhost:${port}/json/version" &>/dev/null; then
      local pages
      pages=$(curl -s --max-time 1 "http://localhost:${port}/json" 2>/dev/null) || pages=""
      if [[ -z "$pages" || "$pages" == "[]" ]]; then
        local pid
        pid=$(lsof -ti "tcp:${port}" 2>/dev/null | head -1) || pid=""
        if [[ -n "$pid" ]]; then
          kill "$pid" 2>/dev/null || true
          rm -rf "/tmp/chrome-cdp-${port}" 2>/dev/null || true
          echo "Cleaned up zombie Chrome on port ${port} (PID ${pid})"
        fi
      fi
    fi
  done
}
