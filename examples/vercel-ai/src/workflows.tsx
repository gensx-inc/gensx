import { openai } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import {
  GenerateObject,
  GenerateText,
  StreamObject,
  StreamText,
} from "@gensx/vercel-ai-sdk";
import {
  GenerateObjectResult,
  StreamObjectResult,
  StreamTextResult,
  tool,
} from "ai";
import { z } from "zod";

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

const BasicChat = gensx.Component<{ prompt: string }, string>(
  "BasicChat",
  ({ prompt }) => (
    <GenerateText
      messages={[
        {
          role: "system",
          content:
            "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. ",
        },
        {
          role: "user",
          content: prompt,
        },
      ]}
      model={openai("gpt-4o-mini")}
    >
      {({ text }) => {
        return text;
      }}
    </GenerateText>
  ),
);

const BasicChatWithTools = gensx.Component<{ prompt: string }, string>(
  "BasicChatWithTools",
  ({ prompt }) => (
    <GenerateText
      messages={[
        {
          role: "system",
          content:
            "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. ",
        },
        {
          role: "user",
          content: prompt,
        },
      ]}
      maxSteps={10}
      model={openai("gpt-4o-mini")}
      tools={tools}
    >
      {({ text }) => {
        return text;
      }}
    </GenerateText>
  ),
);

const StreamingChat = gensx.Component<
  { prompt: string },
  StreamTextResult<typeof tools, string>
>("StreamingChatComponent", ({ prompt }) => (
  <StreamText
    messages={[
      {
        role: "system",
        content:
          "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. ",
      },
      {
        role: "user",
        content: prompt,
      },
    ]}
    model={openai("gpt-4o-mini")}
  ></StreamText>
));

const StreamingChatWithTools = gensx.Component<
  { prompt: string },
  StreamTextResult<typeof tools, string>
>("StreamingChatWithTools", ({ prompt }) => (
  <StreamText
    messages={[
      {
        role: "system",
        content:
          "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. ",
      },
      {
        role: "user",
        content: prompt,
      },
    ]}
    maxSteps={10}
    model={openai("gpt-4o-mini")}
    tools={tools}
  ></StreamText>
));

const trashBinSchema = z.object({
  bins: z.array(
    z.object({
      location: z.string().describe("Location of the trash bin"),
      rating: z.number().describe("Rating from 1-10"),
      review: z.string().describe("A sassy review of the trash bin"),
      bestFinds: z
        .array(z.string())
        .describe("List of the best items found in this bin"),
    }),
  ),
  overallVerdict: z
    .string()
    .describe("Overall verdict on the neighborhood's trash quality"),
});

const StructuredOutput = gensx.Component<
  { prompt: string },
  GenerateObjectResult<z.infer<typeof trashBinSchema>>
>("StructuredOutput", ({ prompt }) => (
  <GenerateObject
    messages={[
      {
        role: "system",
        content:
          "you are a trash eating infrastructure engineer embodied as a racoon. Users will send you some prompt but you should just respond with JSON representing some trash bins in the neighborhood Be sassy and fun and try to make the bins relevant to the user's prompt.",
      },
      {
        role: "user",
        content: prompt,
      },
    ]}
    schema={trashBinSchema}
    model={openai("gpt-4o-mini")}
  >
    {({ object }) => {
      return object;
    }}
  </GenerateObject>
));

const StreamingStructuredOutput = gensx.Component<
  { prompt: string },
  StreamObjectResult<{}, z.infer<typeof trashBinSchema>, string>
>("StreamingStructuredOutput", ({ prompt }) => (
  <StreamObject
    messages={[
      {
        role: "system",
        content:
          "you are a trash eating infrastructure engineer embodied as a racoon. Users will send you some prompt but you should just respond with JSON representing some trash bins in the neighborhood Be sassy and fun and try to make the bins relevant to the user's prompt.",
      },
      {
        role: "user",
        content: prompt,
      },
    ]}
    schema={trashBinSchema}
    model={openai("gpt-4o-mini")}
  ></StreamObject>
));

const BasicChatWorkflow = gensx.Workflow("BasicChatWorkflow", BasicChat);

const BasicChatWithToolsWorkflow = gensx.Workflow(
  "BasicChatWithToolsWorkflow",
  BasicChatWithTools,
);
const StreamingChatWorkflow = gensx.Workflow(
  "StreamingChatWorkflow",
  StreamingChat,
);
const StreamingChatWithToolsWorkflow = gensx.Workflow(
  "StreamingChatWithToolsWorkflow",
  StreamingChatWithTools,
);

const StructuredOutputWorkflow = gensx.Workflow(
  "StructuredOutputWorkflow",
  StructuredOutput,
);

const StreamingStructuredOutputWorkflow = gensx.Workflow(
  "StreamingStructuredOutputWorkflow",
  StreamingStructuredOutput,
);

export {
  BasicChatWorkflow,
  BasicChatWithToolsWorkflow,
  StreamingChatWorkflow,
  StreamingChatWithToolsWorkflow,
  StructuredOutputWorkflow,
  StreamingStructuredOutputWorkflow,
};
