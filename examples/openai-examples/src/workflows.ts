import * as gensx from "@gensx/core";
import { OpenAI } from "@gensx/openai";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import z from "zod";

// importing the openai client from the @gensx/openai package
const openai = new OpenAI();

// alternatively you can import `wrapOpenAI` from @gensx/openai to wrap the client from the "openai" package
// const openai = wrapOpenAI(new OpenAI());

interface OpenAIExampleProps {
  prompt: string;
}

export const BasicCompletion = gensx.Workflow(
  "BasicCompletion",
  async ({ prompt }: OpenAIExampleProps) => {
    const result = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
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
    });
    return result.choices[0].message.content;
  },
);

export const StreamingCompletion = gensx.Workflow(
  "StreamingCompletion",
  async ({ prompt }: OpenAIExampleProps) => {
    const result = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.7,
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
      stream: true,
    });
    return result;
  },
);

const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_weather",
      description: "get the weather for a given location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The location to get the weather for",
          },
        },
        required: ["location"],
      },
      parse: JSON.parse,
      function: (args: { location: string }) => {
        console.log("getting weather for", args.location);
        const weather = ["sunny", "cloudy", "rainy", "snowy"];
        return {
          weather: weather[Math.floor(Math.random() * weather.length)],
        };
      },
    },
  },
];

export const Tools = gensx.Workflow(
  "Tools",
  async ({ prompt }: OpenAIExampleProps) => {
    // eslint-disable-next-line
    const result = await openai.beta.chat.completions.runTools({
      model: "gpt-4.1-mini",
      temperature: 0.7,
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
      tools,
    });
    return await result.finalContent();
  },
);

export const StreamingTools = gensx.Workflow(
  "StreamingTools",
  async ({ prompt }: OpenAIExampleProps) => {
    // eslint-disable-next-line
    const result = await openai.beta.chat.completions.runTools({
      model: "gpt-4.1-mini",
      temperature: 0.7,
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
      tools,
      stream: true,
    });
    return result;
  },
);

const trashRatingSchema = z.object({
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
  async ({ prompt }: OpenAIExampleProps) => {
    const result = await openai.beta.chat.completions.parse({
      model: "gpt-4.1-mini",
      temperature: 0.7,
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
      response_format: zodResponseFormat(trashRatingSchema, "trashRating"),
    });
    return result.choices[0].message.parsed!;
  },
);
