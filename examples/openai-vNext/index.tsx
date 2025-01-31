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

async function structuredOutput() {
  const tool = new GSXTool<z.ZodObject<{ location: z.ZodString }>>(
    "get_weather",
    "get the weather for a given location",
    z.object({
      location: z.string(),
    }),
    async ({ location }) => {
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
            content: `What do you think of kubernetes in one paragraph? but also talk about the current weather`,
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

  const results = await structuredOutput();
  console.log(results.choices[0].message.content);
}

main().catch(console.error);
