import { generateObject, createGateway } from "ai";
import { z } from "zod";
import { retrieveDocs } from "../rag/route";

const REVIEW_PROMPT = `You are a strict code reviewer who checks Next.js and React code against official documentation best practices.

You will receive two things:
1. Source code to review
2. Relevant documentation sections retrieved for that code

Your job: find what is WRONG or NOT following recommended patterns. Be precise. For each issue:
- State what the code does incorrectly or sub-optimally
- Cite the specific doc section that recommends a better approach
- Show what the correct/recommended code should be

Flag these problems (ordered by severity):
1. Deprecated or renamed APIs
2. Incorrect function signatures or options
3. Wrong file conventions (e.g. wrong export, wrong file name)
4. Misuse of server/client boundaries
5. Incorrect caching, revalidation, or data fetching patterns
6. Anti-patterns that the docs explicitly warn against
7. Missing required configuration
8. NOT using the recommended pattern when the docs clearly recommend one (e.g. using direct fetch() in a Client Component event handler instead of calling a Server Function, using useEffect for data fetching instead of the React \`use\` hook with server-passed promises, etc.)
9. Missing opportunities to leverage server-side capabilities (e.g. doing work on the client that could be done in a Server Component or Server Function)

Do NOT flag style preferences, formatting, or things the docs don't cover.

If the code is correct AND follows recommended patterns according to the docs, say so briefly.`;

const reviewSchema = z.object({
  hasIssues: z
    .boolean()
    .describe(
      "true if concrete issues were found OR the code does not follow recommended patterns from the docs. false if the code is correct, follows best practices, is not Next.js/React code, or has no documentation-backed issues."
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

  if (!code || typeof code !== "string") {
    return Response.json({ error: "code is required" }, { status: 400 });
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

  console.log("[Review] POST /api/review, code:", code, "response:", review);

  return Response.json(review);
}
