import { createOpenAI } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import { asToolSet, generateText } from "@gensx/vercel-ai";
import { toolbox } from "../../shared/toolbox";
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
    tools: asToolSet(toolbox),
    model,
    maxSteps: 10,
    prompt: `
      You are a helpful assistant that can answer questions about the current page. Your goal is to identify the most relevant information or actions on the page and return them in a structured format, including CSS selectors.

      Use the tools provided to fetch the content of the page, and do further inspection of the page content in various ways to answer the question.

      The user has asked: ${query}

      Please answer the question based on the content of the current page.
    `,
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
