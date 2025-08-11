import * as gensx from "@gensx/core";
import { asToolSet, generateText } from "@gensx/vercel-ai";
import { getReadonlyTools } from "../../shared/toolbox";
import { toolbox } from "../../shared/toolbox";
import { tool } from "ai";
import z from "zod";
import { anthropic } from "@ai-sdk/anthropic";

// Estimate available text budget considering optional image payload
const getEffectiveTextCharBudget = (includeImage: boolean): number => {
  // Base overall token cap for a request (model-dependent; keep conservative)
  const BASE_TOKEN_BUDGET = 200_000;
  const SAFETY_MARGIN_TOKENS = 8_000; // overhead for tools/system/instructions
  const IMAGE_TOKEN_COST_ESTIMATE = includeImage ? 30_000 : 0; // conservative image cost

  const effectiveTokens = Math.max(
    10_000,
    BASE_TOKEN_BUDGET - IMAGE_TOKEN_COST_ESTIMATE - SAFETY_MARGIN_TOKENS,
  );
  // Approx chars per token heuristic
  return Math.floor(effectiveTokens * 3.5);
};

// Choose a per-chunk size that leaves space for image + reasoning
const getPerChunkCharLimit = (includeImage: boolean): number => {
  // Keep large chunks but slightly smaller if an image is included
  return includeImage ? 180_000 : 200_000;
};

// Helper function to chunk content intelligently for HTML-like content
// Prefers boundaries at closing block tags, then headers/paragraphs, then paragraph breaks, then sentence ends
const chunkContent = (content: string, maxChunkSize: number): string[] => {
  if (content.length <= maxChunkSize) return [content];

  // Utility to find the last match end index for a regex within [from, to)
  const findLastMatchEndInRange = (
    text: string,
    regex: RegExp,
    from: number,
    to: number,
  ): number => {
    const windowText = text.slice(from, to);
    const re = new RegExp(
      regex.source,
      regex.flags.includes("g") ? regex.flags : regex.flags + "g",
    );
    let lastEnd = -1;
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(windowText)) !== null) {
      lastEnd = from + m.index + m[0].length;
    }
    return lastEnd;
  };

  const boundaryPatterns: RegExp[] = [
    /<\/(section|article|main|header|footer|nav)\s*>/gi,
    /<\/(ul|ol)\s*>/gi,
    /<\/(h1|h2|h3|h4|h5|h6)\s*>/gi,
    /<\/p\s*>/gi,
    /\n{2,}/g,
    /\.(?:\s|$)/g,
  ];

  const chunks: string[] = [];
  let pos = 0;
  const minSearchRatio = 0.5; // search window starts at 50% of max size to encourage larger chunks

  while (pos < content.length) {
    const idealEnd = Math.min(pos + maxChunkSize, content.length);
    if (idealEnd >= content.length) {
      chunks.push(content.slice(pos).trim());
      break;
    }

    let breakAt = -1;
    const nearStart = Math.max(
      pos + Math.floor(maxChunkSize * minSearchRatio),
      pos,
    );
    const nearEnd = idealEnd;

    // First, search preferred window [nearStart, nearEnd)
    for (const pattern of boundaryPatterns) {
      const idx = findLastMatchEndInRange(content, pattern, nearStart, nearEnd);
      if (idx !== -1) {
        breakAt = idx;
        break;
      }
    }

    // If not found, broaden search to [pos, idealEnd)
    if (breakAt === -1) {
      for (const pattern of boundaryPatterns) {
        const idx = findLastMatchEndInRange(content, pattern, pos, idealEnd);
        if (idx !== -1) {
          breakAt = idx;
          break;
        }
      }
    }

    const end = breakAt === -1 ? idealEnd : breakAt;
    const chunk = content.slice(pos, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    pos = end;
  }

  // Merge tiny tail chunk into previous to reduce fragmentation
  if (chunks.length >= 2) {
    const last = chunks[chunks.length - 1];
    if (last.length < Math.floor(maxChunkSize * 0.3)) {
      chunks[chunks.length - 2] = (
        chunks[chunks.length - 2] +
        "\n" +
        last
      ).trim();
      chunks.pop();
    }
  }

  return chunks;
};

const queryPage = gensx.Component(
  "queryPage",
  async ({ query, tabId }: { query: string; tabId: number }) => {
    const model = anthropic("claude-3-5-haiku-20241022");
    // const model = openai("gpt-5-nano-2025-08-07");

    // const groq = createOpenAI({
    //   apiKey: process.env.GROQ_API_KEY!,
    //   baseURL: "https://api.groq.com/openai/v1",
    // });
    // const groqModel = groq("moonshotai/kimi-k2-instruct");

    // First, fetch the page content directly using executeExternalTool
    const [pageContent, screenshot] = await Promise.all([
      gensx.executeExternalTool(toolbox, "fetchPageHtml", { tabId }),
      gensx.executeExternalTool(toolbox, "captureElementScreenshot", {
        tabId,
        selector: "body",
        scrollIntoView: true,
      }),
    ]);

    if (!pageContent.success || !pageContent.content) {
      return `Error fetching page content: ${pageContent.error || "Unknown error"}`;
    }

    const includeImage = Boolean(screenshot.image);
    const fullTextBudgetChars = getEffectiveTextCharBudget(includeImage);

    // Check if content is too long and needs chunking
    if (pageContent.content.length <= fullTextBudgetChars) {
      // Content is manageable, analyze directly with full context
      const result = await generateText({
        tools: asToolSet(getReadonlyTools()),
        model,
        temperature: 1,
        maxSteps: 8, // Increased to allow for proper tool usage during analysis
        messages: [
          {
            role: "system",
            content: `You are a skilled and powerful web page analyzer. You are analyzing a web page answer a user query. You will receive the page source, along with a screenshot of the page.

TAB ID: ${tabId}

AVAILABLE TOOLS:
- findInteractiveElements(tabId: ${tabId}, textToFilter?: string[]): Find interactive elements relevant to the query
- inspectElements(tabId: ${tabId}, elements: Array): Get detailed properties of specific elements
- findElementsByText(tabId: ${tabId}, content: string[]): Locate elements by specific text content
- getCurrentUrl(tabId: ${tabId}): Get the current URL

OUTPUT FORMAT (STRICT):
Return ONLY a valid JSON object (no code fences, no extra text) matching this schema:
{
  "answer": "string - concise direct answer to the user's query",
  "elements": [
    {
      "description": "string - what the element is and why it's relevant",
      "selector": "string - optimized CSS selector",
      "truncatedText": "string - up to 160 chars of inner text or nearby content",
      "role": "string | undefined - ARIA or computed role if known",
      "attributes": {
        "id": "string | undefined",
        "class": "string | undefined",
        "name": "string | undefined",
        "type": "string | undefined",
        "href": "string | undefined",
        "src": "string | undefined",
        "aria": { "[key]": "string" } | undefined
      }
    }
  ]
}

GUIDELINES:
- Prefer 3-10 highly relevant elements. If none are relevant, return an empty array.
- Use the tools to obtain accurate selectors and roles when uncertain.
- Keep truncatedText under 160 characters; omit line breaks.
- Do NOT include any text before or after the JSON.

Your JSON must answer: "${query}"`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `
USER QUERY: ${query}

PAGE CONTENT:
${pageContent.content}
`,
              },
              ...(screenshot.image ? [{
                    type: "image" as const,
                    image: screenshot.image,
                  },
                ]
              : []),
            ],
          },
        ],
      });

      // Try to parse JSON response, fall back to text if parsing fails
      try {
        const jsonResponse = JSON.parse(result.text);
        return JSON.stringify(jsonResponse, null, 2);
      } catch {
        return result.text;
      }
    }

    // Content is too long, use chunking with pre-discovered elements
    const perChunkChars = getPerChunkCharLimit(includeImage);
    const chunks = chunkContent(pageContent.content, perChunkChars);
    const chunkAnalyses: string[] = [];

    // Analyze each chunk with awareness of pre-discovered interactive elements
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        const chunkResult = await generateText({
          tools: asToolSet(getReadonlyTools()),
          model,
          maxSteps: 5, // Limited steps for chunk analysis
          messages: [
            {
              role: "system",
              content: `You are a skilled and powerful web page analyzer. You are analyzing chunk ${i + 1}/${chunks.length} of a web page to answer a user query. You will receive an analysis of the page source, along with a screenshot of the page.

TAB ID: ${tabId}

CONTENT CHUNK ${i + 1}/${chunks.length}:
${chunk}

AVAILABLE TOOLS: inspectElements, findElementsByText, getCurrentUrl, findInteractiveElements
- Use inspectElements ONLY if you need detailed properties of elements mentioned in this chunk
- Use findElementsByText ONLY if you need to locate specific text mentioned in this chunk
- Use findInteractiveElements if interactive elements are needed for the query

TASK: Identify content in this chunk relevant to "${query}".

OUTPUT FORMAT (STRICT): Return ONLY JSON with this shape:
{
  "relevanceSummary": "string - direct concise summary of relevant findings in this chunk",
  "elements": [
    {
      "description": "string",
      "selector": "string",
      "truncatedText": "string (<=160 chars)",
      "role": "string | undefined",
      "attributes": {
        "id": "string | undefined",
        "class": "string | undefined",
        "name": "string | undefined",
        "type": "string | undefined",
        "href": "string | undefined",
        "src": "string | undefined",
        "aria": { "[key]": "string" } | undefined
      }
    }
  ]
}`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `USER QUERY: ${query}

CONTENT CHUNK ${i + 1}/${chunks.length}:
${chunk}

`,
                },
                ...(screenshot.image ? [{
                    type: "image" as const,
                    image: screenshot.image,
                  },
                ]
              : []),
              ],
            },
          ],
        });

        chunkAnalyses.push(chunkResult.text);
      } catch (error) {
        chunkAnalyses.push(
          `Chunk ${i + 1} error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Synthesize final response with interactive elements discovery
    const finalResult = await generateText({
      tools: asToolSet(getReadonlyTools()),
      model,
      maxSteps: 8, // Allow sufficient steps for tool usage and analysis
      messages: [
        {
          role: "system",
          content: `You are a skilled and powerful web page analyzer. You are analyzing a web page to answer a user query, based on a previous analysis of chunks of the page. You will receive an analysis of the page source, along with a screenshot of the page.

TAB ID: ${tabId}

BACKGROUND INFORMATION FROM PAGE ANALYSIS (may include JSON from chunks):
${chunkAnalyses.map((analysis, i) => `[Chunk ${i + 1}] ${analysis}`).join("\n\n")}

AVAILABLE TOOLS:
- findInteractiveElements(tabId: ${tabId}, textToFilter?: string[]): Find interactive elements relevant to the query
- inspectElements(tabId: ${tabId}, elements: Array): Get detailed properties of specific elements
- findElementsByText(tabId: ${tabId}, content: string[]): Locate elements by specific text content
- getCurrentUrl(tabId: ${tabId}): Get the current URL

TASK:
Provide a final, self-contained answer and a structured elements list.

OUTPUT FORMAT (STRICT):
Return ONLY a valid JSON object (no code fences, no extra text) matching this schema:
{
  "answer": "string - concise direct answer to the user's query (max 2 sentences)",
  "elements": [
    {
      "description": "string - what the element is and why it's relevant",
      "selector": "string - precise CSS selector",
      "truncatedText": "string - up to 160 chars of inner text or nearby content",
      "role": "string | undefined - ARIA or computed role if known",
      "attributes": {
        "id": "string | undefined",
        "class": "string | undefined",
        "name": "string | undefined",
        "type": "string | undefined",
        "href": "string | undefined",
        "src": "string | undefined",
        "aria": { "[key]": "string" } | undefined
      }
    }
  ]
}

GUIDELINES:
- Prefer 5-10 highly relevant elements. If none are relevant, return an empty array.
- Use the tools to obtain accurate selectors and roles only when uncertain.
- Keep truncatedText for elements under 160 characters; omit line breaks.
- Do NOT include any text before or after the JSON.
`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `USER QUERY: ${query}
`,
            },
            ...(screenshot.image ? [{
                    type: "image" as const,
                    image: screenshot.image,
                  },
                ]
              : []),
          ],
        },
      ],
    });

    // Try to parse JSON response, fall back to text if parsing fails
    try {
      const jsonResponse = JSON.parse(finalResult.text);
      return JSON.stringify(jsonResponse, null, 2);
    } catch {
      return finalResult.text; // Return as-is if not valid JSON
    }
  },
);

export const queryPageTool = tool({
  execute: async ({ query, tabId }: { query: string; tabId: number }) => {
    const result = await queryPage({ query, tabId });
    return result;
  },
  description:
    "Query a specific tab to find information, content, and actions that can be taken. You can use this tool to ask questions about content on the page, find buttons, forms, and other interactive elements, or do analysis of the visual content of the page. This tool cannot take actions or interact with the page, only query the content.",
  parameters: z.object({
    query: z.string().describe("The query to ask about the page"),
    tabId: z.number().describe("The ID of the tab to query."),
  }),
});

// Export the screenshot analysis tool
export { analyzeScreenshotTool } from "./screenshot-analysis";
