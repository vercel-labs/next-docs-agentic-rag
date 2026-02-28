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
            Send any prompt, get back relevant Next.js documentation.
          </p>
        </header>

        {/* Installation */}
        <section className="mb-16 space-y-8">
          <div>
            <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Install
            </h2>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Install the skill, then use{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
                /ask-next
              </code>{" "}
              to look up Next.js docs before coding.
            </p>
            <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-7 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {`# 1. Install the skill
npx skills add vercel-labs/next-docs-agentic-rag

# 2. Use it
/ask-next server actions`}
            </pre>
          </div>
        </section>

        {/* Demo */}
        <section className="pb-24">
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
                  Searching documentation...
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
