import { generateText, createGateway } from "ai";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const NEXT_DOCS_ROOT = join(process.cwd(), ".next-docs");
const REACT_DOCS_ROOT = join(process.cwd(), ".react-docs");

const RETRIEVAL_PROMPT = `You are a documentation retrieval engine. You receive source code and must return every documentation section relevant to reviewing that code for correctness.

You have the ENTIRE Next.js and React documentation below. Read through it and return the sections that are relevant to the code you see. Think about:
- Every Next.js API, component, hook, config option, or file convention used in the code
- React patterns, performance considerations, and best practices relevant to the code
- Migration notes, deprecation notices, renamed APIs — anything where the code might be using an outdated pattern
- Server vs client boundaries, caching behavior, data fetching patterns

Return relevant sections COMPLETE and VERBATIM with file path citations. Never summarize. Never truncate. Never omit code blocks or function signatures.`;

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

const NEXT_DOCS = loadAllDocs(NEXT_DOCS_ROOT, "");
const REACT_DOCS = loadAllDocs(REACT_DOCS_ROOT, "");

const RETRIEVAL_SYSTEM = `${RETRIEVAL_PROMPT}

--- NEXT.JS DOCUMENTATION START ---
${NEXT_DOCS}
--- NEXT.JS DOCUMENTATION END ---

--- REACT DOCUMENTATION START ---
${REACT_DOCS}
--- REACT DOCUMENTATION END ---`;

console.log(
  `[Review] Loaded docs: ${((RETRIEVAL_SYSTEM.length / 1024 / 1024)).toFixed(1)}MB, ~${Math.round(RETRIEVAL_SYSTEM.length / 4)}tok estimate`
);

const REVIEW_PROMPT = `You are a code reviewer who checks Next.js and React code against official documentation.

You will receive two things:
1. Source code to review
2. Relevant documentation sections retrieved for that code

Your job: find what is WRONG. Be precise. For each issue:
- State what the code does incorrectly
- Cite the specific doc section that contradicts it
- Show what the correct code should be

Focus on real problems:
- Deprecated or renamed APIs
- Incorrect function signatures or options
- Wrong file conventions (e.g. wrong export, wrong file name)
- Misuse of server/client boundaries
- Incorrect caching, revalidation, or data fetching patterns
- Anti-patterns that the docs explicitly warn against
- Missing required configuration

Do NOT flag style preferences, formatting, or things the docs don't cover. Only flag issues where the documentation clearly says the code is wrong.

If the code is correct according to the docs, say so briefly.`;

export async function POST(req: Request) {
  const body = await req.json();
  const { code } = body;

  console.log("[Review] POST /api/review");

  if (!code || typeof code !== "string") {
    return new Response(JSON.stringify({ error: "code is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const gateway = createGateway({
    apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
  });

  // Step 1: Retrieve relevant docs using Gemini
  const { text: relevantDocs } = await generateText({
    model: gateway("google/gemini-3.1-flash-lite-preview"),
    system: RETRIEVAL_SYSTEM,
    prompt: code,
    providerOptions: {
      gateway: {
        only: ["google"],
      },
    },
  });

  // Step 2: Review the code against retrieved docs using Sonnet 4.6
  const { text: review } = await generateText({
    model: gateway("anthropic/claude-sonnet-4-6"),
    system: REVIEW_PROMPT,
    prompt: `## Code to review:\n\`\`\`\n${code}\n\`\`\`\n\n## Relevant documentation:\n${relevantDocs}`,
    providerOptions: {
      gateway: {
        only: ["anthropic"],
      },
    },
  });

  return new Response(review);
}
