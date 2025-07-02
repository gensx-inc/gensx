import * as gensx from "@gensx/core";
import { streamText } from "@gensx/vercel-ai";
import { anthropic } from "@ai-sdk/anthropic";

interface PlanInput {
  prompt: string;
}

export const Plan = gensx.Component("Plan", async ({ prompt }: PlanInput) => {
  const systemMessage =
    "You are an experienced research assistant who creates in depth reports based on user prompts.";

  const fullPrompt = `Given the following prompt, generate a research brief for a report on the user's topic.

The brief should just be one or two paragraphs and state the following:
- The objective of the report
- The scope of the report
- Important considerations
- Any key insights or information that should be included in the report
- Any other information that is relevant to the report

The report should be in depth and cover all aspects of the user's topic while not being overly verbose.

Here is the user's prompt:
<prompt>
${prompt}
</prompt>`;

  const response = await streamText({
    model: anthropic("claude-sonnet-4-20250514"),
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

  let text = "";
  for await (const chunk of response.textStream) {
    text += chunk;
    gensx.publishObject("researchBrief", text);
  }

  return text;
});
