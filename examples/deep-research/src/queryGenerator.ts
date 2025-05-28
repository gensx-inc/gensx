import { openai } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import { generateObject } from "@gensx/vercel-ai";
import { z } from "zod";

export interface GenerateQueriesProps {
  prompt: string;
}

export interface GenerateQueriesOutput {
  queries: string[];
}

export const GenerateQueries = gensx.Component(
  "GenerateQueries",
  async ({ prompt }: GenerateQueriesProps): Promise<GenerateQueriesOutput> => {
    const systemMessage = `You are a helpful research assistant.

Instructions:
- You will be given a prompt and your job is to return a list of arxiv search queries
- Please write between 1 and 3 queries

Output Format:
Please return json with the following format:
{
  "queries": ["query1", "query2", "query3"]
}`;

    const response = await generateObject({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        { role: "user", content: prompt },
      ],
      schema: z.object({
        queries: z.array(z.string()),
      }),
    });

    return { queries: response.object.queries };
  },
);
