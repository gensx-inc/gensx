import * as gensx from "@gensx/core";
import { openai } from "@ai-sdk/openai";
import { streamText } from "@gensx/vercel-ai";

export interface ChatProps {
  userMessage: string;
}

export const StreamOutput = gensx.Workflow(
  "StreamOutput",
  async ({ userMessage }: ChatProps) => {
    gensx.publishEvent<string>("status", "starting");

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

    gensx.publishEvent<string>("status", "streaming");

    let text = "";
    for await (const chunk of result.textStream) {
      text += chunk;
      gensx.publishObject<string>("text", text);
    }

    gensx.publishEvent<string>("status", "completed");
    return text;
  },
);
