import * as gensx from "@gensx/core";
import { streamText } from "@gensx/vercel-ai";
import { anthropic } from "@ai-sdk/anthropic";

interface PlanInput {
  prompt: string;
  updateStep: (plan: string) => void | Promise<void>;
}

export const Plan = gensx.Component(
  "Plan",
  async ({ prompt, updateStep }: PlanInput) => {
    const systemMessage =
      "You are an experienced research assistant who creates in depth reports based on user prompts.";

    const fullPrompt = `Given the following prompt, write a short plan for a report on the user's topic.

The plan should just be one or two paragraphs and state the following:
- The objective of the report
- Any important considerations, insights or information that should be included in the report
- Details on what research needs to be done to write the report
- Any other information that is relevant to the report

The plan should be in depth and cover all aspects of the user's topic while not being overly verbose.

Here is the user's prompt:
<prompt>
${prompt}
</prompt>

DO NOT include any headings or subheadings in the brief. Use of bullets, bold, and italic is allowed.`;

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
      await updateStep(text);
    }

    return text;
  },
);
