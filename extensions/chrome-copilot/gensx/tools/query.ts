import { createOpenAI } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import { asToolSet, generateText } from "@gensx/vercel-ai";
import { getReadonlyTools } from "../../shared/toolbox";
import { toolbox } from "../../shared/toolbox";
import { tool } from "ai";
import z from "zod";

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

const queryPage = gensx.Component("queryPage", async ({ query, tabId }: { query: string; tabId: number }) => {
  const groqClient = createOpenAI({
    apiKey: process.env.GROQ_API_KEY!,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const model = groqClient("moonshotai/kimi-k2-instruct");

  // First, fetch the page content directly using executeExternalTool
  const pageContent = await gensx.executeExternalTool(toolbox, "fetchPageText", { tabId });

  if (!pageContent.success || !pageContent.content) {
    return `Error fetching page content: ${pageContent.error || "Unknown error"}`;
  }

  // Check if content is too long and needs chunking (131000 token limit, ~4 characters per token)
  if (pageContent.content.length <= 131000 * 3.5) {
    // Content is manageable, analyze directly with full context
    const result = await generateText({
      tools: asToolSet(getReadonlyTools()), // Available: fetchPageText, getCurrentUrl, getGeolocation, inspectElements, findElementsByText
      model,
      maxSteps: 5, // Reduced since we already have interactive elements
      prompt: `You are analyzing a web page to answer a user query. Interactive elements have already been discovered.

TARGET TAB ID: ${tabId}
USER QUERY: ${query}

PAGE CONTENT:
${pageContent.content}

INSTRUCTIONS:
1. Answer the user query directly based on the page content
2. Use the findInteractiveElements tool to find interactive elements that are relevant to the query
3. Use inspectElements tool (tabId: ${tabId}) ONLY if you need detailed properties of specific elements
4. Use findElementsByText tool (tabId: ${tabId}) ONLY if you need to locate elements by specific text content

RESPONSE FORMAT:
You MUST return a structured JSON response in this exact format:

{
  "answer": "[Direct answer to the user query]",
  "relevantElements": [
    {
      "description": "[What this element does]",
      "selector": "[CSS selector from interactive elements list]",
      "action": "[What action this enables - click, fill, select, etc.]",
      "role": "[ARIA role if available]",
      "ariaLabel": "[aria-label if available]",
      "text": "[visible text content]",
      "purpose": "[Why this element is relevant to the query]"
    }
  ],
  "context": "[Additional information and recommended approach]",
  "suggestedWorkflow": [
    "[Step 1: What to do first]",
    "[Step 2: What to do next]"
  ]
}

Focus on being precise and actionable. Only include elements that are relevant to answering the query.`,
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
          // Only provide subset of readonly tools that make sense for chunk analysis
          inspectElements: getReadonlyTools().inspectElements,
          findElementsByText: getReadonlyTools().findElementsByText,
          getCurrentUrl: getReadonlyTools().getCurrentUrl
        }),
        model,
        maxSteps: 4, // Limited steps for chunk analysis
        prompt: `Analyzing chunk ${i + 1}/${chunks.length} of a web page for user query: "${query}"

TAB ID: ${tabId}

CONTENT CHUNK ${i + 1}/${chunks.length}:
${chunk}

AVAILABLE TOOLS: inspectElements, findElementsByText, getCurrentUrl
- Use inspectElements ONLY if you need detailed properties of elements mentioned in this chunk
- Use findElementsByText ONLY if you need to locate specific text mentioned in this chunk
- Do NOT use findInteractiveElements

TASK: Find content in this chunk relevant to "${query}". Reference the pre-discovered interactive elements list.

${isLastChunk ? 'FINAL CHUNK - Provide summary of findings from this chunk.' : 'PARTIAL ANALYSIS - Focus only on this chunk content.'}`,
      });

      chunkAnalyses.push(chunkResult.text);
    } catch (error) {
      chunkAnalyses.push(`Chunk ${i + 1} error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Synthesize final response with both content analysis and interactive elements
  const finalResult = await generateText({
    model,
    prompt: `Synthesize web page analysis to answer user query: "${query}"

TAB ID: ${tabId}

CONTENT ANALYSIS FROM CHUNKS:
${chunkAnalyses.map((analysis, i) => `[Chunk ${i + 1}] ${analysis}`).join('\n\n')}

FINAL SYNTHESIS:
Combine the content analysis to provide a structured JSON response. Use the findInteractiveElements tool to find interactive elements that are relevant to the query.

You MUST return a structured JSON response in this exact format:

{
  "answer": "[Direct answer to '${query}' based on all chunk analyses]",
  "relevantElements": [
    {
      "description": "[What this element does]",
      "selector": "[CSS selector from pre-discovered interactive elements list]",
      "action": "[What action this enables - click, fill, select, etc.]",
      "role": "[ARIA role from interactive elements list if available]",
      "ariaLabel": "[aria-label from ariaAttributes if available]",
      "text": "[visible text content from interactive elements list]",
      "purpose": "[Why this element is relevant to the query based on chunk analysis]"
    }
  ],
  "context": "[Key information synthesized from all chunks]",
  "suggestedWorkflow": [
    "[Step 1: What to do first based on the analysis]",
    "[Step 2: What to do next]",
    "[Additional steps as needed]"
  ]
}

IMPORTANT:
- Use CSS selectors from the discovered interactive elements list above
- Extract role and ariaLabel information from the interactive elements data
- Base the analysis on insights from all chunk analyses
- Focus on actionable steps that directly address the user query`,
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
