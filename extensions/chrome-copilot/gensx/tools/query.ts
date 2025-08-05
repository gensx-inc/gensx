import { createOpenAI } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import { asToolSet, generateText } from "@gensx/vercel-ai";
import { toolbox } from "../../shared/toolbox";
import { tool } from "ai";
import z from "zod";

const readonlyTools: (keyof typeof toolbox)[] = ["fetchPageText", "findElementsByText", "getCurrentUrl", "inspectElements", "findInteractiveElements"];

const queryPage = gensx.Component("queryPage", async ({ query }: { query: string }) => {
  const groqClient = createOpenAI({
    apiKey: process.env.GROQ_API_KEY!,
    baseURL: "https://api.groq.com/openai/v1",
  });

  // const model = anthropic("claude-3-7-sonnet-latest");

  const model = groqClient("moonshotai/kimi-k2-instruct");

  const result = await generateText({
    tools: {
      // Give the readonly tools to the model so it can use them to answer the question
      ...asToolSet(Object.fromEntries(Object.entries(toolbox).filter(([key]) => readonlyTools.includes(key as keyof typeof toolbox)))),
    },
    model,
    maxSteps: 10,
    prompt: `You are a web page analysis assistant. Your task is to quickly and effectively answer questions about the current page by providing structured, actionable information.

USER QUERY: ${query}

INSTRUCTIONS:
1. First, fetch the page content to understand the current page structure
2. Use the available tools to inspect elements and find relevant information
3. Provide a concise, direct answer to the user's question
4. If applicable, identify specific elements that are relevant to the query
5. Always include CSS selectors for any elements you mention so they can be programmatically accessed

RESPONSE FORMAT:
Answer: [Direct answer to the user's question based on page content]

Relevant Elements: [List of elements with CSS selectors that are useful for the query, if any]
- Element description: [CSS selector]
- Element description: [CSS selector]

Additional Context: [Any additional relevant information from the page]

GUIDELINES:
- Be concise but thorough
- Focus on the most relevant information for the user's specific query
- Always provide CSS selectors for elements you identify
- If no specific elements are relevant, state "No specific elements identified"
- Use the tools efficiently to gather necessary information`,
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
