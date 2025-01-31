import { CompositionCompletion, GSXTool, OpenAIProvider } from "@gensx/openai";
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

// async function toolsSync() {}

// async function toolsStreaming() {}

async function main() {
  // const results = await basicCompletion();
  // console.log(results.choices[0].message.content);

  // const stream = await streamingCompletion();
  // for await (const chunk of stream) {
  //   process.stdout.write(chunk.choices[0].delta.content ?? "");
  // }

  // const results = await tools();
  // console.log(results.choices[0].message.content);

  const stream = await toolsStreaming();
  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0].delta.content ?? "");
  }
}

main().catch(console.error);
