import * as gensx from "@gensx/core";
import { openai } from "@ai-sdk/openai";
import { streamText } from "@gensx/vercel-ai";

interface ChatProps {
  userMessage: string;
}

export const StreamOutput = gensx.Workflow(
  "StreamOutput",
  async ({ userMessage }: ChatProps) => {
    const result = await streamText({
      model: openai("gpt-4.1-mini"),
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
        { role: "user", content: userMessage },
      ],
    });

    const generator = async function* () {
      for await (const chunk of result.textStream) {
        yield chunk;
      }
    };

    return generator();
  },
);

export const BasicOutput = gensx.Workflow(
  "BasicOutput",
  async ({ userMessage }: ChatProps) => {
    return {
      message: "Hello, world!",
      confidence: 0.95,
    };
  },
);
