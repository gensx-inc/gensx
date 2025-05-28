import { openai } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import {
  generateObject,
  generateText,
  streamObject,
  streamText,
} from "@gensx/vercel-ai";
import { tool } from "ai";
import { z } from "zod";

const tools = {
  weather: tool({
    description: "Get the weather in a location",
    parameters: z.object({
      location: z.string().describe("The location to get the weather for"),
    }),
    execute: async ({ location }: { location: string }) => {
      console.log("Executing weather tool with location:", location);
      await new Promise((resolve) => setTimeout(resolve, 100));
      return {
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      };
    },
  }),
} as const;

export const BasicChat = gensx.Workflow(
  "BasicChat",
  async ({ prompt }: { prompt: string }): Promise<string> => {
    const result = await generateText({
      messages: [
        {
          role: "system",
          content:
            "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. ",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: openai("gpt-4o-mini"),
    });
    return result.text;
  },
);

export const BasicChatWithTools = gensx.Workflow(
  "BasicChatWithTools",
  async ({ prompt }: { prompt: string }): Promise<string> => {
    const result = await generateText({
      messages: [
        {
          role: "system",
          content:
            "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. ",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      maxSteps: 10,
      model: openai("gpt-4o-mini"),
      tools: tools,
    });
    return result.text;
  },
);

export const StreamingChat = gensx.Workflow(
  "StreamingChat",
  ({ prompt }: { prompt: string }) => {
    const result = streamText({
      messages: [
        {
          role: "system",
          content:
            "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. ",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: openai("gpt-4o-mini"),
    });

    const generator = async function* () {
      for await (const chunk of result.textStream) {
        yield chunk;
      }
    };

    return generator();
  },
);

export const StreamingChatWithTools = gensx.Workflow(
  "StreamingChatWithTools",
  ({ prompt }: { prompt: string }) => {
    const result = streamText({
      messages: [
        {
          role: "system",
          content:
            "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. ",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      maxSteps: 10,
      model: openai("gpt-4o-mini"),
      tools: tools,
    });

    const generator = async function* () {
      for await (const chunk of result.textStream) {
        yield chunk;
      }
    };

    return generator();
  },
);

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

export const StructuredOutput = gensx.Workflow(
  "StructuredOutput",
  async ({ prompt }: { prompt: string }) => {
    const result = await generateObject({
      messages: [
        {
          role: "system",
          content:
            "you are a trash eating infrastructure engineer embodied as a racoon. Users will send you some prompt but you should just respond with JSON representing some trash bins in the neighborhood Be sassy and fun and try to make the bins relevant to the user's prompt.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      schema: trashBinSchema,
      model: openai("gpt-4o-mini"),
    });
    return result.object;
  },
);

export const StreamingStructuredOutput = gensx.Workflow(
  "StreamingStructuredOutput",
  ({ prompt }: { prompt: string }) => {
    const result = streamObject({
      messages: [
        {
          role: "system",
          content:
            "you are a trash eating infrastructure engineer embodied as a racoon. Users will send you some prompt but you should just respond with JSON representing some trash bins in the neighborhood Be sassy and fun and try to make the bins relevant to the user's prompt.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      schema: trashBinSchema,
      model: openai("gpt-4o-mini"),
    });

    const generator = async function* () {
      for await (const chunk of result.partialObjectStream) {
        yield chunk;
      }
    };

    return generator();
  },
);
