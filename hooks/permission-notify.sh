#!/bin/bash
# hook-event: Notification
# hook-matcher:
# Claude Code Permission Request Notification Hook
# Plays a distinct sound when Claude needs permission to proceed
#
# Configuration (via environment or defaults):
#   CLAUDE_HOOKS_ENABLED - Set to "false" to disable all hooks (default: true)
#   CLAUDE_PERMISSION_SOUND - System sound name (default: Funk)

set -e

# Debug log
DEBUG_LOG="/tmp/claude-notify-debug.log"
echo "[$(date)] Permission hook triggered - PID:$$ PPID:$PPID PWD:$PWD" >> "$DEBUG_LOG"

# Source .env if it exists (for configuration)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
[[ -f "$SCRIPT_DIR/.env" ]] && source "$SCRIPT_DIR/.env"

# Configuration
ENABLED="${CLAUDE_HOOKS_ENABLED:-true}"
SOUND_NAME="${CLAUDE_PERMISSION_SOUND:-Funk}"
SOUND_PATH="/System/Library/Sounds/${SOUND_NAME}.aiff"

# Exit if disabled
if [[ "$ENABLED" == "false" ]]; then
    echo "[$(date)] Disabled - exiting" >> "$DEBUG_LOG"
    exit 0
fi

# No cooldown for permission requests - always want to hear these

# Verify sound exists, fallback to Funk if not
if [[ ! -f "$SOUND_PATH" ]]; then
    SOUND_PATH="/System/Library/Sounds/Funk.aiff"
fi

# Play sound via osascript (works even when terminal not focused)
echo "[$(date)] Playing permission sound: $SOUND_PATH (SCRIPT_DIR=$SCRIPT_DIR)" >> "$DEBUG_LOG"
osascript -e "do shell script \"afplay '$SOUND_PATH' &> /dev/null &\"" &
echo "[$(date)] osascript returned: $?" >> "$DEBUG_LOG"

exit 0
