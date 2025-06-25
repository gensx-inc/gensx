import { openai } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import { useSearch } from "@gensx/storage";
import { embed, generateText } from "@gensx/vercel-ai";
import { tool } from "ai";
import { z } from "zod";

import { InitializeSearch } from "./initialize.js";

// Define the query tool schema
const querySchema = z.object({
  query: z.string().describe("The text query to search for"),
});

type QueryParams = z.infer<typeof querySchema>;

const embeddingModel = openai.embedding("text-embedding-3-small");

const tools = {
  query: tool({
    description: "Query the search index",
    parameters: querySchema,
    execute: async ({ query }: QueryParams) => {
      const search = await useSearch("baseball");
      const embedding = await embed({
        model: embeddingModel,
        value: query,
      });
      const result = await search.query({
        rankBy: ["vector", "ANN", embedding.embedding],
        topK: 10,
        includeAttributes: true,
      });
      return JSON.stringify(result, null, 2);
    },
  }),
} as const;

const RagAgent = gensx.Component(
  "RagAgent",
  async ({ question }: { question: string }) => {
    const result = await generateText({
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant.`,
        },
        {
          role: "user",
          content: question,
        },
      ],
      model: openai("gpt-4.1-mini"),
      tools: tools,
      maxSteps: 10,
    });
    return result.text;
  },
);

export const RagWorkflow = gensx.Workflow(
  "RagWorkflow",
  async ({ question }: { question: string }) => {
    return await RagAgent({ question });
  },
);

export { InitializeSearch };
