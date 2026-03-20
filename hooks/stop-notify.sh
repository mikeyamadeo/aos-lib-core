#!/bin/bash
# hook-event: Stop
# hook-matcher:
# Claude Code Input Notification Hook
# Plays a sound when Claude finishes responding and awaits input
#
# Configuration (via environment or defaults):
#   CLAUDE_HOOKS_ENABLED - Set to "false" to disable all hooks (default: true)
#   CLAUDE_STOP_SOUND - System sound name (default: Pop)
#   CLAUDE_STOP_COOLDOWN - Seconds between notifications (default: 5)

set -e

# Debug log
DEBUG_LOG="/tmp/claude-notify-debug.log"
echo "[$(date)] Hook triggered - PID:$$ PPID:$PPID PWD:$PWD" >> "$DEBUG_LOG"

# Source .env if it exists (for configuration)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
[[ -f "$SCRIPT_DIR/.env" ]] && source "$SCRIPT_DIR/.env"

# Configuration
ENABLED="${CLAUDE_HOOKS_ENABLED:-true}"
COOLDOWN="${CLAUDE_STOP_COOLDOWN:-5}"
SOUND_NAME="${CLAUDE_STOP_SOUND:-Pop}"
SOUND_PATH="/System/Library/Sounds/${SOUND_NAME}.aiff"

# Exit if disabled
if [[ "$ENABLED" == "false" ]]; then
    echo "[$(date)] Disabled - exiting" >> "$DEBUG_LOG"
    exit 0
fi

# Unique timestamp file per terminal session
TIMESTAMP_FILE="/tmp/claude-notify-${PPID:-$$}"

# Check cooldown
if [[ -f "$TIMESTAMP_FILE" ]]; then
    last=$(cat "$TIMESTAMP_FILE" 2>/dev/null || echo 0)
    now=$(date +%s)
    elapsed=$((now - last))
    if [[ $elapsed -lt $COOLDOWN ]]; then
        echo "[$(date)] Cooldown active (${elapsed}s < ${COOLDOWN}s) - skipping" >> "$DEBUG_LOG"
        exit 0
    fi
fi

# Verify sound exists, fallback to Pop if not
if [[ ! -f "$SOUND_PATH" ]]; then
    SOUND_PATH="/System/Library/Sounds/Pop.aiff"
fi

# Play sound in background (non-blocking) and update timestamp
echo "[$(date)] Playing: $SOUND_PATH" >> "$DEBUG_LOG"
osascript -e "do shell script \"afplay '$SOUND_PATH' &> /dev/null &\"" &
date +%s > "$TIMESTAMP_FILE"

exit 0
