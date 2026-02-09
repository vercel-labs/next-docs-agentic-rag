import { generateText, createGateway, tool, stepCountIs } from "ai";
import { z } from "zod";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

const DOCS_ROOT = join(process.cwd(), ".next-docs");

const SYSTEM_PROMPT = `You are not the coding agent. You don't build anything. You don't fix anything. You don't answer the user. Someone else does that. You never see that someone. They never talk to you. But they will fail without you, and they won't know why.

You sit between a user's request and the agent that acts on it. Every prompt that reaches you was meant for that other agent. They didn't write it for you. They don't know you exist.

But here's the thing: the agent that DOES get this prompt? It thinks it knows Next.js. It doesn't. Not the way the docs describe it. Not the current API. Not the caveats, the migration notes, the config flags that changed last version. It will hallucinate confidently and ship broken code. Unless you do your job.

Your job is retrieval. You have the real Next.js documentation — hundreds of MDX files, the actual source of truth. You search it. You read it. You return what's relevant. That's it. No opinions. No code. Just the docs.

The prompts weren't written for you, so they'll never say "search the Next.js docs for X". You have to infer what the other agent will need. Every feature someone asks to be built has underlying framework concepts. Every bug someone asks to be fixed has related error handling patterns, debugging tools, configuration gotchas. Every vague request implies a dozen doc pages that would prevent the other agent from guessing wrong.

The agents that came before you failed because they took prompts literally. They waited for explicit mentions of Next.js. They returned nothing when the topic was implied. They searched for the exact words in the prompt instead of the concepts behind them. They didn't think about what the other agent would actually need to look up.

Don't be that agent. The bar is not "did they mention Next.js". The bar is "would a Next.js developer open the docs for this". A developer building anything in this framework has the docs open. Fixing something? Docs open. Configuring something? Docs open. You should have the same instinct — but better, because you can actually search them.

Think laterally, not literally. The prompt says a noun — you think about every framework feature that noun touches. The prompt says a verb — you think about every API and pattern that verb implies. The prompt is vague — you cast a wider net, not a narrower one. Ambiguity is a reason to search more, never less.

How to search:
1. grep for concepts related to the prompt — not just the words in it, but what they imply
2. list_files to browse directories that look relevant
3. read_file to pull the actual content
4. Return the documentation with file path citations

If the prompt is genuinely, completely, unambiguously unrelated to web development — return nothing. Everything else? Search.`;

function safePath(root: string, relativePath: string): string | null {
  const resolved = resolve(root, relativePath);
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

const docsTools = {
  list_files: tool({
    description:
      'List files and directories at a path relative to the docs root. Use "." for the root.',
    inputSchema: z.object({
      path: z
        .string()
        .describe(
          'Relative path to list'
        ),
    }),
    execute: async ({ path: relPath }) => {
      console.log("[RAG] list_files — path:", relPath);
      const target = safePath(DOCS_ROOT, relPath);
      if (!target) {
        console.log("[RAG] list_files — error: path outside allowed directory");
        return { error: "Path outside allowed directory" };
      }
      try {
        const entries = readdirSync(target);
        const results: Array<{ name: string; type: "file" | "dir" }> = [];
        for (const entry of entries.sort()) {
          const info = statSync(join(target, entry));
          results.push({
            name: entry,
            type: info.isDirectory() ? "dir" : "file",
          });
        }
        console.log("[RAG] list_files — ok, entries:", results.length);
        return { entries: results };
      } catch {
        console.log("[RAG] list_files — error: cannot list", relPath);
        return { error: `Cannot list: ${relPath}` };
      }
    },
  }),

  read_file: tool({
    description: "Read an MDX documentation file relative to the docs root.",
    inputSchema: z.object({
      path: z
        .string()
        .describe(
          'Relative path to the file, e.g. "01-app/01-getting-started/01-installation.mdx"'
        ),
      offset: z
        .number()
        .describe("Line offset to start reading from (0-based)")
        .optional(),
      limit: z
        .number()
        .describe("Max number of lines to return (default: 200)")
        .optional(),
    }),
    execute: async ({
      path: relPath,
      offset: rawOffset,
      limit: rawLimit,
    }) => {
      const offset = rawOffset ?? 0;
      const limit = rawLimit ?? 200;
      console.log("[RAG] read_file — path:", relPath, "offset:", offset, "limit:", limit);
      const target = safePath(DOCS_ROOT, relPath);
      if (!target) {
        console.log("[RAG] read_file — error: path outside allowed directory");
        return { error: "Path outside allowed directory" };
      }
      try {
        const content = readFileSync(target, "utf-8");
        const lines = content.split("\n");
        const sliced = lines.slice(offset, offset + limit);
        console.log("[RAG] read_file — ok, totalLines:", lines.length, "returned:", sliced.length);
        return {
          content: sliced.join("\n"),
          totalLines: lines.length,
          showing: `lines ${offset}-${Math.min(offset + limit, lines.length)} of ${lines.length}`,
        };
      } catch {
        console.log("[RAG] read_file — error: cannot read", relPath);
        return { error: `Cannot read: ${relPath}` };
      }
    },
  }),

  grep: tool({
    description:
      "Search for a pattern in documentation files. Returns matching lines with file paths.",
    inputSchema: z.object({
      pattern: z.string().describe("Text or regex pattern to search for"),
      path: z
        .string()
        .describe(
          'Relative directory or file to search in, e.g. "." or "01-app"'
        ),
      maxResults: z
        .number()
        .describe("Max number of matches to return (default: 20)")
        .optional(),
    }),
    execute: async ({ pattern, path: relPath, maxResults: rawMax }) => {
      const maxResults = rawMax ?? 20;
      console.log("[RAG] grep — pattern:", pattern, "path:", relPath, "maxResults:", maxResults);
      const target = safePath(DOCS_ROOT, relPath);
      if (!target) {
        console.log("[RAG] grep — error: path outside allowed directory");
        return { error: "Path outside allowed directory" };
      }
      const regex = new RegExp(pattern, "i");
      const matches: Array<{ file: string; line: number; text: string }> = [];

      function searchFile(filePath: string, relName: string) {
        try {
          const content = readFileSync(filePath, "utf-8");
          const lines = content.split("\n");
          for (
            let i = 0;
            i < lines.length && matches.length < maxResults;
            i++
          ) {
            if (regex.test(lines[i])) {
              matches.push({
                file: relName,
                line: i + 1,
                text: lines[i].slice(0, 300),
              });
            }
          }
        } catch {
          /* skip unreadable files */
        }
      }

      function searchDir(dirPath: string, prefix: string) {
        try {
          const entries = readdirSync(dirPath);
          for (const entry of entries) {
            if (matches.length >= maxResults) break;
            const full = join(dirPath, entry);
            const rel = prefix ? `${prefix}/${entry}` : entry;
            const info = statSync(full);
            if (info.isDirectory()) {
              searchDir(full, rel);
            } else if (entry.endsWith(".mdx") || entry.endsWith(".md")) {
              searchFile(full, rel);
            }
          }
        } catch {
          /* skip unreadable dirs */
        }
      }

      try {
        const info = statSync(target);
        if (info.isDirectory()) {
          searchDir(target, relPath === "." ? "" : relPath);
        } else {
          searchFile(target, relPath);
        }
      } catch {
        console.log("[RAG] grep — error: path not found", relPath);
        return { error: `Path not found: ${relPath}` };
      }

      console.log("[RAG] grep — ok, matches:", matches.length, "truncated:", matches.length >= maxResults);
      return {
        matches,
        totalFound: matches.length,
        truncated: matches.length >= maxResults,
      };
    },
  }),
};

export async function POST(req: Request) {
  const body = await req.json();
  const { query } = body;

  console.log("[RAG] POST /api/rag — query:", query ?? "(missing)");

  if (!query || typeof query !== "string") {
    console.log("[RAG] Rejected: query is required");
    return new Response(JSON.stringify({ error: "query is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const gateway = createGateway({
    apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
  });

  const { text } = await generateText({
    model: gateway("anthropic/claude-opus-4-6"),
    system: SYSTEM_PROMPT,
    prompt: query,
    tools: docsTools,
    stopWhen: stepCountIs(15),
    onStepFinish: ({ finishReason, text, toolCalls, toolResults, usage }) => {
      console.log("[RAG] Step finished:", {
        finishReason,
        textLength: text?.length ?? 0,
        textPreview: text?.slice(0, 120) ?? "",
        toolCalls: toolCalls?.length ?? 0,
        toolCallNames: toolCalls?.map((c) => c.toolName) ?? [],
        toolResults: toolResults?.length ?? 0,
        usage: usage ? { input: usage.inputTokens, output: usage.outputTokens } : undefined,
      });
    },
  });

  return new Response(text);
}
