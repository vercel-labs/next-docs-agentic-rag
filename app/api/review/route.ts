import { generateObject, createGateway } from "ai";
import { z } from "zod";
import { retrieveDocs } from "../rag/route";

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

const reviewSchema = z.object({
  hasIssues: z
    .boolean()
    .describe(
      "true ONLY if concrete issues were found backed by documentation. false if the code is correct, is not Next.js/React code, or has no documentation-backed issues."
    ),
  review: z
    .string()
    .describe(
      "The review text. If hasIssues is true, describe each issue. If false, briefly confirm the code is correct."
    ),
});

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

  // Step 1: Retrieve relevant docs via RAG
  const relevantDocs = await retrieveDocs(code);

  // Step 2: Review the code against retrieved docs using Sonnet 4.6
  const gateway = createGateway({
    apiKey: process.env.AI_GATEWAY_API_KEY ?? "",
  });

  const { object: review } = await generateObject({
    model: gateway("anthropic/claude-sonnet-4-6"),
    system: REVIEW_PROMPT,
    prompt: `## Code to review:\n\`\`\`\n${code}\n\`\`\`\n\n## Relevant documentation:\n${relevantDocs}`,
    schema: reviewSchema,
    providerOptions: {
      gateway: {
        only: ["anthropic"],
      },
    },
  });

  return new Response(JSON.stringify(review), {
    headers: { "Content-Type": "application/json" },
  });
}
