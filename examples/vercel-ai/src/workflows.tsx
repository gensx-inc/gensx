import { openai } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import { GenerateText, StreamText, wrap } from "@gensx/vercel-ai-sdk";
import { StreamTextResult, tool } from "ai";
import { OpenAI } from "openai";
import { z } from "zod";

const openaiClient = wrap(
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  }),
);

// RAG agent component that wraps GSXChatCompletion
const GenerateTextComponent = gensx.Component<{ prompt: string }, string>(
  "GenerateTextComponent",
  ({ prompt }) => (
    <GenerateText
      //prompt={prompt}
      messages={[{ role: "user", content: prompt }]}
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
    >
      {({ text }) => {
        return text;
      }}
    </GenerateText>
  ),
);

const tools = {
  weather: tool({
    description: "Get the weather in a location",
    parameters: z.object({
      location: z.string().describe("The location to get the weather for"),
    }),
    execute: async ({ location }: { location: string }) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return {
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      };
    },
  }),
} as const;

const StreamTextComponent = gensx.Component<
  { prompt: string },
  StreamTextResult<typeof tools, string>
>("StreamTextComponent", ({ prompt }) => (
  <StreamText
    prompt={prompt}
    maxSteps={10}
    model={openai("gpt-4o-mini")}
    tools={tools}
  ></StreamText>
));

const OpenAIChatComponent = gensx.Component<{ prompt: string }, string>(
  "OpenAIChatComponent",
  async ({ prompt }) => {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    return completion.choices[0].message.content ?? "";
  },
);

const OpenAIResponseComponent = gensx.Component<{ prompt: string }, string>(
  "OpenAIResponseComponent",
  async ({ prompt }) => {
    const response = await openaiClient.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
      tools: [{ type: "web_search_preview" }],
    });
    return response.output_text ?? "";
  },
);

const VercelWorkflow = gensx.Workflow("VercelWorkflow", GenerateTextComponent);
const VercelWorkflowStream = gensx.Workflow(
  "VercelWorkflowStream",
  StreamTextComponent,
);
const OpenAIChatWorkflow = gensx.Workflow(
  "OpenAIChatWorkflow",
  OpenAIChatComponent,
);
const OpenAIResponseWorkflow = gensx.Workflow(
  "OpenAIResponseWorkflow",
  OpenAIResponseComponent,
);

export {
  VercelWorkflow,
  VercelWorkflowStream,
  OpenAIChatWorkflow,
  OpenAIResponseWorkflow,
};
