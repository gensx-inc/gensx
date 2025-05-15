import { openai } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import { GenerateText } from "@gensx/vercel-ai-sdk";
import { tool } from "ai";
import { z } from "zod";

// RAG agent component that wraps GSXChatCompletion
const GenerateTextComponent = gensx.Component<{ prompt: string }, string>(
  "GenerateTextComponent",
  ({ prompt }) => (
    <GenerateText
      prompt={prompt}
      maxSteps={10}
      model={openai("gpt-4o-mini")}
      tools={{
        weather: tool({
          description: "Get the weather in a location",
          parameters: z.object({
            location: z
              .string()
              .describe("The location to get the weather for"),
          }),
          execute: async ({ location }: { location: string }) => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return {
              location,
              temperature: 72 + Math.floor(Math.random() * 21) - 10,
            };
          },
        }),
      }}
    />
  ),
);

const VercelWorkflow = gensx.Workflow("VercelWorkflow", GenerateTextComponent);

export { VercelWorkflow };
