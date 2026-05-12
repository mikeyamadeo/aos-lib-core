#!/usr/bin/env bash
# chrome-cdp.sh — Launch real Chrome with CDP for browser automation
#
# Why: Playwright-launched browsers have detectable TLS/HTTP/2 fingerprints
# that WAFs (Akamai, Cloudflare) block. Launching Chrome independently
# preserves authentic fingerprints. agent-browser connects after-the-fact
# via --cdp for automation only.
#
# Usage (per markdown bash block — nothing in shell env survives between blocks):
#   # First block: one-shot init (locked so concurrent starts don't race).
#   source chrome-cdp.sh
#   chrome_cdp_init
#   agent-browser --session "$CDP_SESSION" --cdp "$CDP_PORT" snapshot
#
#   # Subsequent blocks: cheap state reload.
#   source chrome-cdp.sh && cdp_state_load
#   agent-browser --session "$CDP_SESSION" --cdp "$CDP_PORT" snapshot -i
#
#   # Final block: mandatory close (prevents daemon leak).
#   source chrome-cdp.sh && cdp_state_load && agent_browser_close
#
# State file: /tmp/claude-cdp/${workspace_key}.env  (workspace_key = sha of git root or PWD)
# Session name: cdp-${workspace_key}-${cdp_port}  (deterministic; survives bash-block boundaries via state file)

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
    _pid_signal_fallback "${CDP_PID}"
    CDP_PID=""
  fi
  rm -rf "${CDP_USER_DATA}" 2>/dev/null || true
  echo "Chrome CDP stopped."
}

# Stop the Chrome instance whose PID is recorded in OUR workspace state file.
# Safe across parallel agents: only touches our own Chrome, never anyone else's.
chrome_cdp_stop_owned() {
  cdp_state_load
  local pid="${CDP_PID:-}"
  local user_data="${CDP_USER_DATA:-}"
  local port="${CDP_PORT:-}"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    _pid_signal_fallback "$pid"
    echo "Stopped owned Chrome on port ${port} (PID ${pid})"
  fi
  [[ -n "$user_data" ]] && rm -rf "$user_data" 2>/dev/null || true
  cdp_state_clear
}

# Default cleanup (no flag): only touch state files whose recorded Chrome PID
# is dead. Safe across parallel agents.
# --force: legacy 9222-9241 scan that kills any idle CDP responder. Echoes a
#   warning because this can clobber other agents' Chrome instances.
chrome_cdp_cleanup() {
  local force=false
  [[ "${1:-}" == "--force" ]] && force=true

  if $force; then
    echo "WARN: chrome_cdp_cleanup --force scans ports 9222-9241 globally and may kill other agents' Chrome instances." >&2
    local port
    for port in $(seq 9222 9241); do
      if curl -s --max-time 1 "http://localhost:${port}/json/version" &>/dev/null; then
        local pid
        pid=$(lsof -ti "tcp:${port}" 2>/dev/null | head -1) || pid=""
        if [[ -n "$pid" ]]; then
          kill "$pid" 2>/dev/null || true
          rm -rf "/tmp/chrome-cdp-${port}" 2>/dev/null || true
          echo "Cleaned up Chrome on port ${port} (PID ${pid})"
        fi
      fi
    done
    return 0
  fi

  # Default: scoped cleanup via state files. Touch nothing alive, nothing unrecorded.
  local state_dir
  state_dir=$(cdp_state_dir)
  [[ -d "$state_dir" ]] || return 0
  local statefile
  shopt -s nullglob
  for statefile in "$state_dir"/*.env; do
    (
      CDP_PID=""
      CDP_USER_DATA=""
      CDP_PORT=""
      # shellcheck disable=SC1090
      source "$statefile" 2>/dev/null || exit 0
      if [[ -z "${CDP_PID:-}" ]] || ! kill -0 "$CDP_PID" 2>/dev/null; then
        [[ -n "${CDP_USER_DATA:-}" ]] && rm -rf "$CDP_USER_DATA" 2>/dev/null || true
        rm -f "$statefile"
        echo "Cleaned up dead state: $(basename "$statefile") (port ${CDP_PORT:-?}, pid ${CDP_PID:-?})"
      fi
    )
  done
  shopt -u nullglob
}

# ---------------------------------------------------------------------------
# Persisted state (survives across markdown bash blocks)
# ---------------------------------------------------------------------------

cdp_state_dir() { printf '%s' "${CDP_STATE_DIR:-/tmp/claude-cdp}"; }

# Memoized via env export so command-substitution subshells ($(cdp_workspace_key))
# inherit the cache. Prime once at the top of chrome_cdp_init; subsequent calls
# — including from subshells — skip the git+shasum work.
cdp_workspace_key() {
  if [[ -z "${_CDP_WORKSPACE_KEY_CACHE:-}" ]]; then
    local key="${CDP_WORKSPACE_KEY:-}"
    if [[ -z "$key" ]]; then
      key=$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)
    fi
    _CDP_WORKSPACE_KEY_CACHE=$(printf '%s' "$key" | shasum | cut -c1-12)
    export _CDP_WORKSPACE_KEY_CACHE
  fi
  printf '%s' "$_CDP_WORKSPACE_KEY_CACHE"
}

# Path helpers — agent-browser daemon pidfile and socket paths for a session.
_agent_browser_pidfile() { printf '%s/.agent-browser/%s.pid' "${HOME}" "$1"; }
_agent_browser_sockfile() { printf '%s/.agent-browser/%s.sock' "${HOME}" "$1"; }

# SIGTERM, give it a second, then SIGKILL. Used by every teardown path.
_pid_signal_fallback() {
  local pid="$1"
  [[ -z "$pid" ]] && return 0
  kill "$pid" 2>/dev/null || true
  sleep 1
  kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
}

cdp_state_path() {
  printf '%s/%s.env' "$(cdp_state_dir)" "$(cdp_workspace_key)"
}

cdp_state_load() {
  local path
  path=$(cdp_state_path)
  if [[ -r "$path" ]]; then
    # shellcheck disable=SC1090
    source "$path"
    CDP_FLAG="--cdp ${CDP_PORT}"
  fi
}

cdp_state_save() {
  local path
  path=$(cdp_state_path)
  mkdir -p "$(dirname "$path")"
  # Single-quote values so embedded spaces / metacharacters in paths can't
  # break the sourced file. Values themselves never contain single quotes
  # (CDP_* are paths and integers), so no quote-escaping is required.
  {
    printf "CDP_PORT='%s'\n" "${CDP_PORT}"
    printf "CDP_PID='%s'\n" "${CDP_PID:-}"
    printf "CDP_SESSION='%s'\n" "${CDP_SESSION:-}"
    printf "CDP_USER_DATA='%s'\n" "${CDP_USER_DATA:-}"
  } > "$path"
}

cdp_state_clear() {
  rm -f "$(cdp_state_path)" 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# agent-browser daemon lifecycle (scoped, never uses pkill -f)
# ---------------------------------------------------------------------------

# Returns 0 if a daemon process exists for the given session and its pid is alive.
agent_browser_alive() {
  local session="${1:-${CDP_SESSION:-}}"
  [[ -z "$session" ]] && return 1
  local pidfile
  pidfile=$(_agent_browser_pidfile "$session")
  [[ -r "$pidfile" ]] || return 1
  local pid
  pid=$(cat "$pidfile" 2>/dev/null) || return 1
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

# Idempotent. Derives a deterministic CDP_SESSION from the workspace key + port
# (regenerated if the port has changed since last save — covers Chrome restart on
# a new port), persists state, and warms the daemon.
agent_browser_ensure() {
  cdp_state_load
  if [[ -z "${CDP_PORT:-}" ]]; then
    echo "ERROR: agent_browser_ensure: no CDP_PORT in state; run chrome_cdp_start first." >&2
    return 1
  fi
  local expected="cdp-$(cdp_workspace_key)-${CDP_PORT}"
  if [[ "${CDP_SESSION:-}" != "$expected" ]]; then
    # Either no session yet, or Chrome restarted on a new port and the old
    # session name encodes a stale port. Regenerate.
    CDP_SESSION="$expected"
    cdp_state_save
  fi
  if ! agent_browser_alive "${CDP_SESSION}"; then
    agent-browser --session "${CDP_SESSION}" --cdp "${CDP_PORT}" snapshot >/dev/null 2>&1 || true
  fi
  export CDP_SESSION CDP_PORT CDP_FLAG
}

# One-shot init for skills: load state, start Chrome if needed, ensure daemon.
# Guarded by an mkdir-based atomic lock (portable, no flock dependency) so two
# same-workspace runs starting concurrently can't both spawn Chrome and
# race-overwrite each other's state. Stale locks (holding PID is dead) are
# reclaimed automatically.
chrome_cdp_init() {
  # Prime the workspace-key cache in the parent shell so every later
  # $(cdp_workspace_key) call inherits it via env instead of re-running
  # git rev-parse | shasum | cut.
  cdp_workspace_key >/dev/null
  local state_dir lock_dir attempts lock_pid
  state_dir="$(cdp_state_dir)"
  mkdir -p "$state_dir"
  lock_dir="${state_dir}/$(cdp_workspace_key).lock.d"

  attempts=0
  while ! mkdir "$lock_dir" 2>/dev/null; do
    attempts=$((attempts + 1))
    if [[ $attempts -gt 50 ]]; then  # ~5s with 0.1s sleep
      lock_pid=$(cat "$lock_dir/pid" 2>/dev/null || true)
      if [[ -n "$lock_pid" ]] && ! kill -0 "$lock_pid" 2>/dev/null; then
        rm -rf "$lock_dir"
        continue
      fi
      echo "WARN: chrome_cdp_init: lock held by PID ${lock_pid:-?} for >5s; proceeding without lock." >&2
      break
    fi
    sleep 0.1
  done
  echo $$ > "$lock_dir/pid" 2>/dev/null || true

  cdp_state_load
  if [[ -z "${CDP_PORT:-}" ]] || ! curl -s --max-time 2 "http://localhost:${CDP_PORT}/json/version" >/dev/null; then
    chrome_cdp_start
    cdp_state_save
  fi
  agent_browser_ensure

  rm -rf "$lock_dir" 2>/dev/null || true
}

# Mandatory at task end. Closes the daemon recorded in state, with a pid-based
# fallback if `agent-browser close` can't reach a wedged daemon.
agent_browser_close() {
  cdp_state_load
  local session="${CDP_SESSION:-}"
  [[ -z "$session" ]] && return 0
  agent-browser --session "$session" close >/dev/null 2>&1 || true
  local pidfile
  pidfile=$(_agent_browser_pidfile "$session")
  if [[ -r "$pidfile" ]]; then
    local pid
    pid=$(cat "$pidfile" 2>/dev/null) || pid=""
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      _pid_signal_fallback "$pid"
    fi
    rm -f "$pidfile" "$(_agent_browser_sockfile "$session")" 2>/dev/null || true
  fi
  CDP_SESSION=""
  cdp_state_save
  echo "Closed agent-browser session: ${session}"
}

# Reap stale daemons in OUR workspace's namespace ONLY. Never uses pkill -f.
#   - pidfile exists, pid dead → remove pidfile + socket
#   - pidfile exists, pid alive, but not the daemon in our state file → kill it (orphan)
#   - active session per current state file → leave alone
agent_browser_reap_stale() {
  local our_prefix
  our_prefix="cdp-$(cdp_workspace_key)-"
  # The "active session" we protect from reaping is only valid if the Chrome
  # process recorded in state is still alive. Otherwise the state file is
  # stale (crashed shell, killed Chrome) and the named daemon is an orphan.
  local active_session
  active_session=$(
    CDP_SESSION=""
    CDP_PID=""
    [[ -r "$(cdp_state_path)" ]] && source "$(cdp_state_path)" 2>/dev/null
    if [[ -n "${CDP_PID:-}" ]] && kill -0 "$CDP_PID" 2>/dev/null; then
      printf '%s' "${CDP_SESSION:-}"
    fi
  )
  shopt -s nullglob
  local pidfile
  for pidfile in "${HOME}"/.agent-browser/*.pid; do
    local base pid sockfile
    base=$(basename "$pidfile" .pid)
    [[ "$base" == ${our_prefix}* ]] || continue
    sockfile=$(_agent_browser_sockfile "$base")
    pid=$(cat "$pidfile" 2>/dev/null) || pid=""
    if [[ -z "$pid" ]] || ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$pidfile" "$sockfile" 2>/dev/null || true
      continue
    fi
    if [[ -n "$active_session" && "$base" == "$active_session" ]]; then
      continue
    fi
    _pid_signal_fallback "$pid"
    rm -f "$pidfile" "$sockfile" 2>/dev/null || true
    echo "Reaped orphan agent-browser session: ${base} (PID ${pid})"
  done
  shopt -u nullglob
}
