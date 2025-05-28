import * as gensx from "@gensx/core";
import { Anthropic } from "@gensx/anthropic";

// importing the anthropic client from the @gensx/anthropic package
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// alternatively you can import `wrapAnthropic` from @gensx/anthropic to wrap the client from the "anthropic" package
// const anthropic = wrapAnthropic(new Anthropic());

interface AnthropicExampleProps {
  prompt: string;
}

export const BasicCompletion = gensx.Workflow(
  "BasicCompletion",
  async ({ prompt }: AnthropicExampleProps): Promise<string> => {
    const result = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      temperature: 0.7,
      max_tokens: 1024,
      system:
        "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. ",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });
    return result.content[0].type === "text" ? result.content[0].text : "";
  },
);

export const StreamingCompletion = gensx.Workflow(
  "StreamingCompletion",
  async ({ prompt }: AnthropicExampleProps) => {
    const result = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      temperature: 0.7,
      max_tokens: 1024,
      system:
        "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. ",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: true,
    });
    return result;
  },
);
