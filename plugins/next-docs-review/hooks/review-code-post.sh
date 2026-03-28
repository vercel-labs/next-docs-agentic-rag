#!/bin/bash
# Post-Write/Edit hook: resets the review flag so the file can be reviewed again on future writes.

set -euo pipefail

REVIEW_MAP="/tmp/claude-review-map-$(echo "$CLAUDE_PROJECT_DIR" | md5sum 2>/dev/null | cut -d' ' -f1 || echo "$CLAUDE_PROJECT_DIR" | md5 2>/dev/null | tr -d ' ')"

# If no map file exists, nothing to do
if [ ! -f "$REVIEW_MAP" ]; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

# Remove this file from the reviewed set
if [ -n "$FILE_PATH" ] && [ "$FILE_PATH" != "null" ]; then
  grep -vFx "$FILE_PATH" "$REVIEW_MAP" > "${REVIEW_MAP}.tmp" 2>/dev/null || true
  mv "${REVIEW_MAP}.tmp" "$REVIEW_MAP"
fi

exit 0
