import { createOpenAI } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import { asToolSet, generateText } from "@gensx/vercel-ai";
import { getReadonlyTools } from "../../shared/toolbox";
import { tool } from "ai";
import z from "zod";

const queryPage = gensx.Component("queryPage", async ({ query }: { query: string }) => {
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
    prompt: `You are a web page analysis assistant. Answer questions about the current page by providing actionable information with CSS selectors.

USER QUERY: ${query}

WORKFLOW:
1. Fetch page content to understand structure
2. Use inspection tools to find relevant elements
3. Provide structured response with actionable details

RESPONSE FORMAT:
Answer: [Direct answer based on page content]

Relevant Elements:
- [Element description]: [CSS selector]
- [Element description]: [CSS selector]

Additional Context: [Any other relevant information]

REQUIREMENTS:
- Always include CSS selectors for mentioned elements
- Be concise but complete
- Focus on information directly relevant to the query
- State "No specific elements identified" if none are relevant`,
  });

  return result.text;
});

export const queryPageTool = tool({
  execute: async ({ query }: { query: string }) => {
    const result = await queryPage({ query });
    return result;
  },
  description: "Query the current page to find information, content, and actions that can be taken",
  parameters: z.object({
    query: z.string().describe("The query to ask about the current page"),
  }),
})
