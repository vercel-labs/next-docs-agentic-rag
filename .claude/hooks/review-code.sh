#!/bin/bash
# Pre-Write/Edit hook: sends code to the review API, blocks if issues found.
# Uses a tracking file to ensure each file is only reviewed once per write cycle.
# The PostToolUse hook (review-code-post.sh) resets the flag after each write.

set -euo pipefail

# Stable map file keyed to the project dir so pre and post hooks share it
REVIEW_MAP="/tmp/claude-review-map-$(echo "$CLAUDE_PROJECT_DIR" | md5sum 2>/dev/null | cut -d' ' -f1 || echo "$CLAUDE_PROJECT_DIR" | md5 2>/dev/null | tr -d ' ')"

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name')

# Extract the code being written/edited
if [ "$TOOL" = "Write" ]; then
  CODE=$(echo "$INPUT" | jq -r '.tool_input.content')
elif [ "$TOOL" = "Edit" ]; then
  CODE=$(echo "$INPUT" | jq -r '.tool_input.new_string')
else
  exit 0
fi

# Skip empty or tiny changes (< 50 chars)
if [ ${#CODE} -lt 50 ]; then
  exit 0
fi

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

# Skip if this file has already been reviewed (flag set by a previous PreToolUse)
if [ -f "$REVIEW_MAP" ] && grep -qFx "$FILE_PATH" "$REVIEW_MAP" 2>/dev/null; then
  exit 0
fi

# Skip non-code files (markdown, text, config, shell scripts, etc.)
case "$FILE_PATH" in
  *.md|*.mdx|*.txt|*.json|*.yaml|*.yml|*.toml|*.env*|*.lock|*.css|*.svg|*.html|*.sh)
    exit 0
    ;;
esac

# Send to review API
REVIEW=$(curl -s --max-time 30 \
  -X POST "https://next-docs-agentic-rag.labs.vercel.dev/api/review" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg code "$CODE" '{code: $code}')" \
  2>/dev/null) || true

# If the API call failed or returned nothing, allow the write
if [ -z "$REVIEW" ]; then
  exit 0
fi

# Parse the structured JSON response from the review API
HAS_ISSUES=$(echo "$REVIEW" | jq -r '.hasIssues' 2>/dev/null) || true
REVIEW_TEXT=$(echo "$REVIEW" | jq -r '.review' 2>/dev/null) || true

# If we couldn't parse JSON (old format or error), allow the write
if [ "$HAS_ISSUES" != "true" ] && [ "$HAS_ISSUES" != "false" ]; then
  exit 0
fi

# Mark this file as reviewed so subsequent writes skip the review
echo "$FILE_PATH" >> "$REVIEW_MAP"

if [ "$HAS_ISSUES" = "true" ]; then
  # Issues found — block the write
  jq -n \
    --arg reason "$REVIEW_TEXT" \
    '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": ("Code review found issues. Fix these before writing:\n\n" + $reason)
      }
    }'
else
  # No issues — allow
  jq -n \
    --arg reason "Code review passed for $FILE_PATH" \
    --arg context "$REVIEW_TEXT" \
    '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "allow",
        "permissionDecisionReason": $reason,
        "additionalContext": ("Code review:\n\n" + $context)
      }
    }'
fi
