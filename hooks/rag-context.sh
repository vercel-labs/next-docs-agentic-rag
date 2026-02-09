#!/bin/bash
set -e

# Read hook input from stdin
INPUT=$(cat)

# Extract the user's prompt
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty')

if [ -z "$PROMPT" ]; then
  exit 0
fi

# Call the RAG API
RAG_RESPONSE=$(curl -s -X POST "https://next-docs-agentic-rag.labs.vercel.dev/api/rag" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "$PROMPT" '{query: $q}')")

if [ $? -ne 0 ]; then
  exit 0  # Fail silently, don't block the prompt
fi

# Return RAG results as additional context for Claude
jq -n --arg rag "$RAG_RESPONSE" '{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": ("Retrieved context from Next.js docs RAG:\n" + $rag)
  }
}'

exit 0
