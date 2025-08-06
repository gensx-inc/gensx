import { createOpenAI } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import { asToolSet, generateText } from "@gensx/vercel-ai";
import { getReadonlyTools } from "../../shared/toolbox";
import { tool } from "ai";
import z from "zod";

const queryPage = gensx.Component("queryPage", async ({ query, tabId }: { query: string; tabId: number }) => {
  const groqClient = createOpenAI({
    apiKey: process.env.GROQ_API_KEY!,
    baseURL: "https://api.groq.com/openai/v1",
  });

  // const model = anthropic("claude-3-7-sonnet-latest");

  const model = groqClient("moonshotai/kimi-k2-instruct");

  const result = await generateText({
    tools: asToolSet(getReadonlyTools()),
    model,
    maxSteps: 10,
    prompt: `You are a web page analysis assistant. Answer questions about a specific tab by providing actionable information with CSS selectors.

TARGET TAB ID: ${tabId}

USER QUERY: ${query}

WORKFLOW:
1. Fetch page content from the specified tab to understand structure
2. Use inspection tools on the specified tab to find relevant elements
3. Provide structured response with actionable details

IMPORTANT: All tool calls must include tabId: ${tabId} parameter to target the correct tab.

RESPONSE FORMAT:
Answer: [Direct answer based on page content]

Relevant Elements:
- [Element description]: [CSS selector]
- [Element description]: [CSS selector]

Additional Context: [Any other relevant information]

REQUIREMENTS:
- Always include tabId: ${tabId} in every tool call
- Always include CSS selectors for mentioned elements
- Be concise but complete
- Focus on information directly relevant to the query
- State "No specific elements identified" if none are relevant`,
  });

  return result.text;
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
