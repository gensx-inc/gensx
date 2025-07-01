import * as gensx from "@gensx/core";
import { generateObject } from "@gensx/vercel-ai";
import { anthropic } from "@ai-sdk/anthropic";
import z from "zod";

interface PlanInput {
  prompt: string;
}

export const Plan = gensx.Component("Plan", async ({ prompt }: PlanInput) => {
  const systemMessage = "You are an experienced research assistant.";

  const fullPrompt = `Given the following prompt, generate a research brief and 5 unique search queries to research the topic thoroughly.

PROMPT:
${prompt}`;

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: z.object({
      researchBrief: z
        .string()
        .describe(
          "A research brief outlining the objectives, scope, and key considerations.",
        ),
      queries: z.array(z.string()),
    }),
    messages: [
      {
        role: "system",
        content: systemMessage,
      },
      {
        role: "user",
        content: fullPrompt,
      },
    ],
  });
  return object;
});
