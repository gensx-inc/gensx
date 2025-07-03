import * as gensx from "@gensx/core";
import { generateObject } from "@gensx/vercel-ai";
import { anthropic } from "@ai-sdk/anthropic";
import z from "zod";

interface WriteQueriesInput {
  researchBrief: string;
  updateStep?: (queries: string[]) => void | Promise<void>;
}

export const WriteQueries = gensx.Component(
  "WriteQueries",
  async ({ researchBrief, updateStep }: WriteQueriesInput) => {
    const systemMessage = "You are an experienced research assistant.";

    const fullPrompt = `Given the following research brief, generate 3 short search queries to find relevant information on the topic. Search queries should generally be between 3 and 7 words.

<researchBrief>
${researchBrief}
</researchBrief>
`;

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-20250514"),
      schema: z.object({
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

    // Update the step if updateStep function is provided
    if (updateStep) {
      await updateStep(object.queries);
    }

    return object;
  },
);
