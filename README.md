# Deslop-as-a-Service

Stop your AI coding agent from hallucinating outdated Next.js APIs.

This project loads the **entire** Next.js and React documentation into a system prompt, then uses Gemini Flash Lite to retrieve only the sections relevant to a given prompt. The result is grounded, citation-backed context that keeps coding agents honest.

## How it works

```
User prompt ──> RAG endpoint ──> Gemini Flash Lite (full docs in system prompt)
                                         │
                                   Relevant doc sections
                                   (verbatim, with citations)
```

Two API endpoints:

| Endpoint           | What it does                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `POST /api/rag`    | Takes a prompt, returns relevant Next.js/React doc sections                                        |
| `POST /api/review` | Takes code, retrieves relevant docs via RAG, then reviews the code against them using Claude Sonnet |

## Install as a plugin

Includes a pre-write hook that reviews code against the docs before every Write/Edit.

```sh
# Add the marketplace
/plugin marketplace add vercel-labs/next-docs-agentic-rag

# Install the plugin
/plugin install next-docs-review@next-docs-plugins
```

## Run locally

```sh
pnpm install
pnpm dev
```

Set `AI_GATEWAY_API_KEY` in your environment.

Open [http://localhost:3000](http://localhost:3000) to try the demo UI — it has a RAG tab for doc retrieval and a Review tab for code review.
