import {
  CompositionCompletion,
  GSXStructuredOutput,
  GSXTool,
  OpenAIProvider,
} from "@gensx/openai";
import { gsx } from "gensx";
import {
  ChatCompletion as ChatCompletionOutput,
  ChatCompletionChunk,
} from "openai/resources/chat/completions.js";
import { Stream } from "openai/streaming";
import { z } from "zod";

async function basicCompletion() {
  const results = await gsx.execute<ChatCompletionOutput>(
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <CompositionCompletion
        messages={[
          {
            role: "system",
            content:
              "you are a trash eating infrastructure engineer embodied as a racoon. Be saassy and fun. ",
          },
          {
            role: "user",
            content: `What do you think of kubernetes in one paragraph?`,
          },
        ]}
        model="gpt-4o-mini"
        temperature={0.7}
      />
    </OpenAIProvider>,
  );

  return results;
}

async function tools() {
  // Define the schema as a Zod object
  const weatherSchema = z.object({
    location: z.string(),
  });

  // Use z.infer to get the type for our parameters
  type WeatherParams = z.infer<typeof weatherSchema>;

  // Create the tool with the correct type - using the schema type, not the inferred type
  const tool = new GSXTool<typeof weatherSchema>(
    "get_weather",
    "get the weather for a given location",
    weatherSchema,
    async ({ location }: WeatherParams) => {
      console.log("getting weather for", location);
      const weather = ["sunny", "cloudy", "rainy", "snowy"];
      return Promise.resolve({
        weather: weather[Math.floor(Math.random() * weather.length)],
      });
    },
  );

  const results = await gsx.execute<ChatCompletionOutput>(
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <CompositionCompletion
        messages={[
          {
            role: "system",
            content:
              "you are a trash eating infrastructure engineer embodied as a racoon. Be saassy and fun. ",
          },
          {
            role: "user",
            content: `What do you think of kubernetes in one paragraph? but also talk about the current weather. Make up a location and ask for the weather in that location from the tool.`,
          },
        ]}
        model="gpt-4o-mini"
        temperature={0.7}
        tools={[tool]}
      />
    </OpenAIProvider>,
  );

  return results;
}

async function toolsStreaming() {
  // Define the schema as a Zod object
  const weatherSchema = z.object({
    location: z.string(),
  });

  // Use z.infer to get the type for our parameters
  type WeatherParams = z.infer<typeof weatherSchema>;

  // Create the tool with the correct type - using the schema type, not the inferred type
  const tool = new GSXTool<typeof weatherSchema>(
    "get_weather",
    "get the weather for a given location",
    weatherSchema,
    async ({ location }: WeatherParams) => {
      console.log("getting weather for", location);
      const weather = ["sunny", "cloudy", "rainy", "snowy"];
      return Promise.resolve({
        weather: weather[Math.floor(Math.random() * weather.length)],
      });
    },
  );

  const results = await gsx.execute<Stream<ChatCompletionChunk>>(
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <CompositionCompletion
        stream={true}
        messages={[
          {
            role: "system",
            content:
              "you are a trash eating infrastructure engineer embodied as a racoon. Be saassy and fun. ",
          },
          {
            role: "user",
            content: `What do you think of kubernetes in one paragraph? but also talk about the current weather. Make up a location and ask for the weather in that location from the tool.`,
          },
        ]}
        model="gpt-4o-mini"
        temperature={0.7}
        tools={[tool]}
      />
    </OpenAIProvider>,
  );

  return results;
}

async function streamingCompletion() {
  const results = await gsx.execute<Stream<ChatCompletionChunk>>(
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <CompositionCompletion
        stream={true}
        messages={[
          {
            role: "system",
            content:
              "you are a trash eating infrastructure engineer embodied as a racoon. Be saassy and fun. ",
          },
          {
            role: "user",
            content: `What do you think of kubernetes in one paragraph?`,
          },
        ]}
        model="gpt-4o-mini"
        temperature={0.7}
      />
    </OpenAIProvider>,
  );

  return results;
}

async function structuredOutput() {
  // Define a schema for rating trash bins
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

  type TrashRating = z.infer<typeof trashRatingSchema>;

  // Create a structured output wrapper
  const structuredOutput = new GSXStructuredOutput(trashRatingSchema, {
    description: "Rate and review different trash bins in a neighborhood",
    examples: [
      {
        bins: [
          {
            location: "Behind the fancy restaurant",
            rating: 9,
            review: "Michelin star garbage, simply exquisite!",
            bestFinds: ["day-old croissants", "barely touched sushi"],
          },
        ],
        overallVerdict:
          "High-class neighborhood with refined taste in leftovers",
      },
    ],
  });

  const results = await gsx.execute<TrashRating>(
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <CompositionCompletion
        messages={[
          {
            role: "system",
            content:
              "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun.",
          },
          {
            role: "user",
            content:
              "Rate and review three different trash bins in the neighborhood. Be creative with the locations!",
          },
        ]}
        model="gpt-4o-mini"
        temperature={0.7}
        structuredOutput={structuredOutput}
      />
    </OpenAIProvider>,
  );

  return results;
}

async function main() {
  console.log("basic completion 🔥");
  const r = await basicCompletion();
  console.log(r.choices[0].message.content);

  console.log("streaming completion 🔥");
  const stream = await streamingCompletion();
  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0].delta.content ?? "");
  }
  console.log("\n");

  console.log("tools completion 🔥");
  const results = await tools();
  console.log(results.choices[0].message.content);

  console.log("tools streaming completion 🔥");
  const s2 = await toolsStreaming();
  for await (const chunk of s2) {
    process.stdout.write(chunk.choices[0].delta.content ?? "");
  }
  console.log("\n");

  console.log("structured output completion 🔥");
  const structured = await structuredOutput();
  console.log(structured.overallVerdict);
  console.log(structured);
}

main().catch(console.error);
