#!/usr/bin/env bash
# hook-event: PreToolUse
# hook-matcher: Write|Edit
# hook-description: Validates output path structure under artifacts/<namespace>/
set -euo pipefail

# Source .env for DEFAULT_AGENT_OUTPUT_PATH
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
[[ -f "$SCRIPT_DIR/.env" ]] && source "$SCRIPT_DIR/.env"

OUTPUT_BASE="${DEFAULT_AGENT_OUTPUT_PATH:-./artifacts/}"
# Normalize: strip leading ./ for matching
OUTPUT_BASE_NORM="${OUTPUT_BASE#./}"

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

[ -z "$file_path" ] && exit 0

case "$file_path" in
  */"$OUTPUT_BASE_NORM"*|"$OUTPUT_BASE_NORM"*)
    relative="${file_path##*$OUTPUT_BASE_NORM}"
    slash_count=$(echo "$relative" | tr -cd '/' | wc -c | tr -d ' ')
    if [ "$slash_count" -lt 1 ]; then
      echo "Output path must follow ${OUTPUT_BASE_NORM}<plugin>/... convention. Got: ${OUTPUT_BASE_NORM}${relative}" >&2
      exit 2
    fi
    ;;
esac

exit 0
