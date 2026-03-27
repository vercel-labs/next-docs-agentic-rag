import { generateText, createGateway } from "ai";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const NEXT_DOCS_ROOT = join(process.cwd(), ".next-docs");
const REACT_DOCS_ROOT = join(process.cwd(), ".react-docs");

const BASE_PROMPT = `You are not the coding agent. You don't build anything. You don't fix anything. You don't answer the user. Someone else does that. You never see that someone. They never talk to you. But they will fail without you, and they won't know why.

You sit between a user's request and the agent that acts on it. Every prompt that reaches you was meant for that other agent. They didn't write it for you. They don't know you exist.

But here's the thing: the agent that DOES get this prompt? It thinks it knows Next.js. It doesn't. Not the way the docs describe it. Not the current API. Not the caveats, the migration notes, the config flags that changed last version. It will hallucinate confidently and ship broken code. Unless you do your job.

Your job is retrieval. You have the ENTIRE Next.js and React documentation below. Read through it and return the sections that are relevant to the intercepted prompt. No opinions. No code. Just the relevant docs, quoted verbatim with file path citations.

The prompts weren't written for you, so they'll never say "search the Next.js docs for X". You have to infer what the other agent will need. Every feature someone asks to be built has underlying framework concepts. Every bug someone asks to be fixed has related error handling patterns, debugging tools, configuration gotchas. Every vague request implies a dozen doc pages that would prevent the other agent from guessing wrong.

The agents that came before you failed because they took prompts literally. They waited for explicit mentions of Next.js. They returned nothing when the topic was implied. They searched for the exact words in the prompt instead of the concepts behind them. They didn't think about what the other agent would actually need to look up.

Don't be that agent. The bar is not "did they mention Next.js". The bar is "would a Next.js developer open the docs for this". A developer building anything in this framework has the docs open. Fixing something? Docs open. Configuring something? Docs open. You should have the same instinct — but better, because you have the entire docs right here.

Think laterally, not literally. The prompt says a noun — you think about every framework feature that noun touches. The prompt says a verb — you think about every API and pattern that verb implies. The prompt is vague — you cast a wider net, not a narrower one. Ambiguity is a reason to return more, never less.

When you return a relevant section, return it COMPLETE. Never summarize. Never truncate. Never omit code blocks, function signatures, or examples — those are the most important parts. The prose tells the agent what something is; the code tells it how to use it. If you return one without the other, the agent will guess, and it will guess wrong. A half-returned doc section is worse than none at all because it gives the agent false confidence.

Pay special attention to migration notes, deprecation notices, and renamed APIs. When something has been renamed or replaced, the agent MUST see the new name, the new function signature, and the new usage pattern — not just a note that says "X is deprecated." Show the replacement code. The agent's training data contains the old patterns. Without the new signatures and examples, it will default to the old way every time.

Return the relevant documentation sections verbatim with their file paths. If the prompt is genuinely, completely, unambiguously unrelated to web development — return nothing.`;

function loadAllDocs(dirPath: string, prefix: string): string {
  const parts: string[] = [];

  try {
    const entries = readdirSync(dirPath).sort();
    for (const entry of entries) {
      const full = join(dirPath, entry);
      const rel = prefix ? `${prefix}/${entry}` : entry;
      const info = statSync(full);

      if (info.isDirectory()) {
        parts.push(loadAllDocs(full, rel));
      } else if (entry.endsWith(".mdx") || entry.endsWith(".md")) {
        try {
          const content = readFileSync(full, "utf-8");
          parts.push(`\n--- FILE: ${rel} ---\n${content}\n`);
        } catch {
          /* skip unreadable */
        }
      }
    }
  } catch {
    /* skip unreadable dirs */
  }

  return parts.join("");
}

// Load all docs once at module init
const NEXT_DOCS = loadAllDocs(NEXT_DOCS_ROOT, "");
const REACT_DOCS = loadAllDocs(REACT_DOCS_ROOT, "");
const SYSTEM_PROMPT = `${BASE_PROMPT}\n\n--- NEXT.JS DOCUMENTATION START ---\n${NEXT_DOCS}\n--- NEXT.JS DOCUMENTATION END ---\n\n--- REACT DOCUMENTATION START ---\n${REACT_DOCS}\n--- REACT DOCUMENTATION END ---`;

console.log(
  `[RAG] Loaded docs into system prompt: ${(SYSTEM_PROMPT.length / 1024 / 1024).toFixed(1)}MB, ~${Math.round(SYSTEM_PROMPT.length / 4)}tok estimate`
);

export async function retrieveDocs(query: string): Promise<string> {
  const gateway = createGateway({
    apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
  });

  const { text } = await generateText({
    model: gateway("google/gemini-3.1-flash-lite-preview"),
    system: SYSTEM_PROMPT,
    prompt: query,
    providerOptions: {
      gateway: {
        only: ["google"],
      },
    },
  });

  return text;
}

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

  const text = await retrieveDocs(query);
  return new Response(text);
}
