import * as gensx from "@gensx/core";
import { asToolSet, generateText } from "@gensx/vercel-ai";
import { getReadonlyTools } from "../../shared/toolbox";
import { toolbox } from "../../shared/toolbox";
import { tool } from "ai";
import z from "zod";
import { openai } from "@ai-sdk/openai";

// Helper function to chunk content intelligently
const chunkContent = (content: string, maxChunkSize: number): string[] => {
  if (content.length <= maxChunkSize) {
    return [content];
  }

  const chunks: string[] = [];
  let currentPos = 0;

  while (currentPos < content.length) {
    let chunkEnd = Math.min(currentPos + maxChunkSize, content.length);

    // If we're not at the end of the content, try to find a good break point
    if (chunkEnd < content.length) {
      // Look backwards for good breaking points (paragraph breaks, headers, list items)
      const breakPoints = ['\n\n', '\n#', '\n##', '\n###', '\n-', '\n*', '\n1.', '\n2.', '\n3.', '\n4.', '\n5.'];
      let bestBreakPoint = chunkEnd;

      // Search backwards from the ideal chunk end for a good break point
      for (let i = chunkEnd; i > currentPos + maxChunkSize * 0.7; i--) {
        for (const breakPoint of breakPoints) {
          if (content.substring(i, i + breakPoint.length) === breakPoint) {
            bestBreakPoint = i + breakPoint.length;
            break;
          }
        }
        if (bestBreakPoint !== chunkEnd) break;
      }

      chunkEnd = bestBreakPoint;
    }

    const chunk = content.substring(currentPos, chunkEnd).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    currentPos = chunkEnd;
  }

  return chunks.filter(chunk => chunk.length > 0);
};

// Helper function to get tools with analysis capabilities
const getToolsWithAnalysisCapabilities = () => {
  const readonlyTools = getReadonlyTools();
  return readonlyTools; // Keep it simple - use screenshot analysis directly in prompt
};

const queryPage = gensx.Component("queryPage", async ({ query, tabId }: { query: string; tabId: number }) => {
  // const model = anthropic("claude-3-5-sonnet-20241022");
  const model = openai("gpt-5-nano-2025-08-07");

  // const groq = createOpenAI({
  //   apiKey: process.env.GROQ_API_KEY!,
  //   baseURL: "https://api.groq.com/openai/v1",
  // });
  // const groqModel = groq("moonshotai/kimi-k2-instruct");

  // First, fetch the page content directly using executeExternalTool
  const pageContent = await gensx.executeExternalTool(toolbox, "fetchPageText", { tabId });

  if (!pageContent.success || !pageContent.content) {
    return `Error fetching page content: ${pageContent.error || "Unknown error"}`;
  }

  // Check if content is too long and needs chunking (400,000 token limit, ~4 characters per token)
  if (pageContent.content.length <= 400_000 * 3.5) {
    // Content is manageable, analyze directly with full context
    const result = await generateText({
      tools: asToolSet(getToolsWithAnalysisCapabilities()), // Available: fetchPageText, getCurrentUrl, geolocation, inspectElements, findElementsByText, findInteractiveElements
      model,
      temperature: 1,
      maxSteps: 8, // Increased to allow for proper tool usage during analysis
      prompt: `You are analyzing a web page to directly answer a user query.

USER QUERY: ${query}
TAB ID: ${tabId}

PAGE CONTENT:
${pageContent.content}

AVAILABLE TOOLS:
- findInteractiveElements(tabId: ${tabId}, textToFilter?: string[]): Find interactive elements relevant to the query
- inspectElements(tabId: ${tabId}, elements: Array): Get detailed properties of specific elements
- findElementsByText(tabId: ${tabId}, content: string[]): Locate elements by specific text content
- getCurrentUrl(tabId: ${tabId}): Get the current URL

INSTRUCTIONS:
1. Use the available tools (especially findInteractiveElements) to gather the information needed to answer the user's query
2. When mentioning ANY page element, button, link, form, or visual component, ALWAYS include its CSS selector
3. Provide a complete, self-contained answer that directly addresses what the user asked
4. Include specific details like CSS selectors, locations, descriptions - make your response actionable
5. Do not reference your analysis process - answer as if speaking directly to the user

FORMAT REQUIREMENT:
Whenever you mention an element, use this format: "[element description] (selector: CSS_SELECTOR)"
Example: "The login button (selector: button[type='submit'].login-btn) is located in the header"

Your response should completely answer: "${query}"`,
    });

    return result.text;
  }

  // Content is too long, use chunking with pre-discovered elements
  const chunks = chunkContent(pageContent.content, 18000);
  const chunkAnalyses: string[] = [];

  // Analyze each chunk with awareness of pre-discovered interactive elements
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const isLastChunk = i === chunks.length - 1;

    try {
      const chunkResult = await generateText({
        tools: asToolSet({
          // Only provide subset of tools that make sense for chunk analysis
          inspectElements: getReadonlyTools().inspectElements,
          findElementsByText: getReadonlyTools().findElementsByText,
          getCurrentUrl: getReadonlyTools().getCurrentUrl
        }),
        model,
        maxSteps: 5, // Limited steps for chunk analysis
        prompt: `Analyzing chunk ${i + 1}/${chunks.length} of a web page for user query: "${query}"

TAB ID: ${tabId}

CONTENT CHUNK ${i + 1}/${chunks.length}:
${chunk}

AVAILABLE TOOLS: inspectElements, findElementsByText, getCurrentUrl
- Use inspectElements ONLY if you need detailed properties of elements mentioned in this chunk
- Use findElementsByText ONLY if you need to locate specific text mentioned in this chunk

TASK: Find content in this chunk relevant to "${query}".

IMPORTANT: When mentioning any elements, use findElementsByText to get their CSS selectors and include them in format: "element description (selector: css.selector)"

${isLastChunk ? 'FINAL CHUNK - Provide summary of findings from this chunk with CSS selectors for any mentioned elements.' : 'PARTIAL ANALYSIS - Focus only on this chunk content, include selectors for any elements mentioned.'}`,
      });

      chunkAnalyses.push(chunkResult.text);
    } catch (error) {
      chunkAnalyses.push(`Chunk ${i + 1} error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Synthesize final response with interactive elements discovery
  const finalResult = await generateText({
    tools: asToolSet({
      findInteractiveElements: getReadonlyTools().findInteractiveElements,
      inspectElements: getReadonlyTools().inspectElements,
      findElementsByText: getReadonlyTools().findElementsByText,
      getCurrentUrl: getReadonlyTools().getCurrentUrl
    }),
    model,
    maxSteps: 8, // Allow sufficient steps for tool usage and analysis
    prompt: `You need to answer this user query directly: "${query}"

TAB ID: ${tabId}

BACKGROUND INFORMATION FROM PAGE ANALYSIS:
${chunkAnalyses.map((analysis, i) => `[Chunk ${i + 1}] ${analysis}`).join('\n\n')}

AVAILABLE TOOLS:
- findInteractiveElements(tabId: ${tabId}, textToFilter?: string[]): Find interactive elements relevant to the query
- inspectElements, findElementsByText, getCurrentUrl: Additional analysis tools

TASK:
Use the background information and available tools to provide a complete, self-contained answer to the user's query: "${query}"

IMPORTANT:
- Answer directly as if speaking to the user who asked the question
- When mentioning ANY page element, ALWAYS include its CSS selector using format: "[description] (selector: CSS_SELECTOR)"
- Include specific details they requested (selectors, locations, descriptions, etc.)
- Do not reference internal analysis steps or chunk processing
- Provide actionable information they can use immediately
- Use findInteractiveElements tool to get accurate selectors for elements you mention

FORMAT REQUIREMENT:
Always mention elements with their selectors: "element description (selector: css.selector)"

Your response should completely answer: "${query}"`,
  });

  // Try to parse JSON response, fall back to text if parsing fails
  try {
    const jsonResponse = JSON.parse(finalResult.text);
    return JSON.stringify(jsonResponse, null, 2);
  } catch {
    return finalResult.text; // Return as-is if not valid JSON
  }
});

export const queryPageTool = tool({
  execute: async ({ query, tabId }: { query: string; tabId: number }) => {
    const result = await queryPage({ query, tabId });
    return result;
  },
  description: "Query a specific tab to find information, content, and actions that can be taken.",
  parameters: z.object({
    query: z.string().describe("The query to ask about the page"),
    tabId: z.number().describe("The ID of the tab to query."),
  }),
})

// Export the screenshot analysis tool
export { analyzeScreenshotTool } from "./screenshot-analysis";
