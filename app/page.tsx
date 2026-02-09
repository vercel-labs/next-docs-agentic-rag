"use client";

import { useState, FormEvent } from "react";

export default function Home() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setAnswer("");

    try {
      const response = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setAnswer((prev) => prev + chunk);
      }
    } catch (err) {
      setAnswer(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Next.js Docs RAG API
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Agentic retrieval-augmented generation over local Next.js
            documentation. Powered by Claude Opus 4.6 via Vercel AI Gateway.
          </p>
        </header>

        {/* API Documentation */}
        <section className="mb-16 space-y-8">
          <div>
            <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Endpoint
            </h2>
            <code className="block rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              POST https://next-docs-agentic-rag.labs.vercel.dev/api/rag
            </code>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              How it works
            </h2>
            <p className="leading-7 text-zinc-600 dark:text-zinc-400">
              This API is designed to sit between a user prompt and a coding
              agent. Send any prompt — it doesn&apos;t need to mention Next.js
              explicitly. The RAG agent infers what documentation the coding
              agent would need, searches 379 local MDX files using{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
                grep
              </code>
              ,{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
                list_files
              </code>
              , and{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
                read_file
              </code>{" "}
              tools, and returns the relevant documentation.
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Request
            </h2>
            <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {`POST https://next-docs-agentic-rag.labs.vercel.dev/api/rag
Content-Type: application/json

{
  "query": "build a todo list with server actions"
}`}
            </pre>
            <div className="mt-3 space-y-1">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
                  query
                </code>{" "}
                <span className="text-zinc-400 dark:text-zinc-500">
                  string, required
                </span>{" "}
                — The prompt to retrieve documentation for. Can be any coding
                task, bug report, or question. Does not need to mention Next.js.
              </p>
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Response
            </h2>
            <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
              Returns{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
                text/plain
              </code>{" "}
              — the relevant documentation content with file path citations.
            </p>
            <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {`// 200 OK
// Content-Type: text/plain

Based on the Next.js documentation...

## Server Actions
...

Sources:
- 01-app/01-getting-started/08-updating-data.mdx
- 01-app/02-guides/forms.mdx`}
            </pre>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Usage with{" "}
              <code className="text-lg">fetch</code>
            </h2>
            <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {`const response = await fetch("https://next-docs-agentic-rag.labs.vercel.dev/api/rag", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "fix the auth flow" }),
});

const docs = await response.text();
// Pass \`docs\` as context to your coding agent`}
            </pre>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Tools
            </h2>
            <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
              The agent has access to 3 sandboxed, read-only tools scoped to the{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
                .next-docs
              </code>{" "}
              directory:
            </p>
            <div className="space-y-3">
              {[
                {
                  name: "grep",
                  desc: "Regex search across all .mdx/.md files. Returns matching lines with file paths and line numbers.",
                  params: "pattern, path, maxResults?",
                },
                {
                  name: "list_files",
                  desc: "List files and directories at a given path. Used to browse the doc tree.",
                  params: "path",
                },
                {
                  name: "read_file",
                  desc: "Read an MDX file with optional pagination (offset/limit).",
                  params: "path, offset?, limit?",
                },
              ].map((t) => (
                <div
                  key={t.name}
                  className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-baseline gap-2">
                    <code className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {t.name}
                    </code>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      ({t.params})
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {t.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Configuration
            </h2>
            <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <p>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  Model:
                </span>{" "}
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
                  anthropic/claude-opus-4-6
                </code>{" "}
                via Vercel AI Gateway
              </p>
              <p>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  Max steps:
                </span>{" "}
                15 (tool call rounds before the agent must respond)
              </p>
              <p>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  Env:
                </span>{" "}
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
                  AI_GATEWAY_API_KEY
                </code>{" "}
                required in{" "}
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
                  .env.local
                </code>
              </p>
            </div>
          </div>
        </section>

        {/* Demo */}
        <section>
          <div className="mb-6 flex items-baseline gap-3">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Try it
            </h2>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              demo
            </span>
          </div>

          <form onSubmit={handleSubmit} className="mb-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="build a dashboard with auth"
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {loading ? "Searching..." : "Ask"}
              </button>
            </div>
          </form>

          {(answer || loading) && (
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              {loading && !answer && (
                <div className="flex items-center gap-3 text-zinc-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                  Exploring documentation...
                </div>
              )}
              {answer && (
                <div className="whitespace-pre-wrap text-zinc-800 leading-7 dark:text-zinc-200">
                  {answer}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
