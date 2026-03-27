"use client";

import { useState, FormEvent } from "react";

type Tab = "rag" | "review";

export default function Home() {
  const [tab, setTab] = useState<Tab>("rag");

  const [query, setQuery] = useState("");
  const [ragAnswer, setRagAnswer] = useState("");
  const [ragLoading, setRagLoading] = useState(false);

  const [code, setCode] = useState("");
  const [reviewAnswer, setReviewAnswer] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  async function handleRagSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim() || ragLoading) return;

    setRagLoading(true);
    setRagAnswer("");

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
        setRagAnswer((prev) => prev + chunk);
      }
    } catch (err) {
      setRagAnswer(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setRagLoading(false);
    }
  }

  async function handleReviewSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || reviewLoading) return;

    setReviewLoading(true);
    setReviewAnswer("");

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
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
        setReviewAnswer((prev) => prev + chunk);
      }
    } catch (err) {
      setReviewAnswer(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setReviewLoading(false);
    }
  }

  const loading = tab === "rag" ? ragLoading : reviewLoading;
  const answer = tab === "rag" ? ragAnswer : reviewAnswer;

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
        <section className="mb-16">
          <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Install as a plugin
          </h2>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            A pre-write hook that blocks incorrect Next.js code before
            it&apos;s written.
          </p>
          <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-7 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            {`# 1. Add the marketplace
/plugin marketplace add vercel-labs/next-docs-agentic-rag

# 2. Install the plugin
/plugin install next-docs-review@next-docs-plugins`}
          </pre>
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

          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              onClick={() => setTab("rag")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === "rag"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              }`}
            >
              RAG
            </button>
            <button
              onClick={() => setTab("review")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === "review"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              }`}
            >
              Review
            </button>
          </div>

          {/* RAG Tab */}
          {tab === "rag" && (
            <form onSubmit={handleRagSubmit} className="mb-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="build a dashboard with auth"
                  className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  disabled={ragLoading}
                />
                <button
                  type="submit"
                  disabled={ragLoading || !query.trim()}
                  className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  {ragLoading ? "Searching..." : "Ask"}
                </button>
              </div>
            </form>
          )}

          {/* Review Tab */}
          {tab === "review" && (
            <form onSubmit={handleReviewSubmit} className="mb-6">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={`import Image from "next/image";\n\nexport default function Page() {\n  return <Image src="/hero.png" width={500} height={300} />;\n}`}
                rows={10}
                className="mb-3 w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 font-mono text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                disabled={reviewLoading}
              />
              <button
                type="submit"
                disabled={reviewLoading || !code.trim()}
                className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {reviewLoading ? "Reviewing..." : "Review"}
              </button>
            </form>
          )}

          {(answer || loading) && (
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              {loading && !answer && (
                <div className="flex items-center gap-3 text-zinc-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                  {tab === "rag"
                    ? "Searching documentation..."
                    : "Reviewing code..."}
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
