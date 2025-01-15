import { setTimeout } from "timers/promises";

import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx, Streamable } from "gensx";

async function runStreamingWithChildrenExample() {
  const prompt =
    "Write a 250 word story about an AI that discovers the meaning of friendship through a series of small interactions with humans. Be concise but meaningful.";

  console.log("\n🚀 Starting streaming example with prompt:", prompt);

  console.log("\n📝 Non-streaming version (waiting for full response):");
  await gsx.execute<string>(
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <ChatCompletion
        model="gpt-4o-mini"
        messages={[{ role: "user", content: prompt }]}
      >
        {async (response: string) => {
          await setTimeout(0);
          console.log(response);
        }}
      </ChatCompletion>
    </OpenAIProvider>,
  );

  console.log("\n📝 Streaming version (processing tokens as they arrive):");
  await gsx.execute(
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <ChatCompletion
        model="gpt-4o-mini"
        stream={true}
        messages={[{ role: "user", content: prompt }]}
      >
        {async (response: Streamable) => {
          // Print tokens as they arrive
          for await (const token of response) {
            process.stdout.write(token);
          }
          process.stdout.write("\n");
          console.log("✅ Streaming complete");
        }}
      </ChatCompletion>
    </OpenAIProvider>,
  );
}

async function runStreamingExample() {
  const prompt =
    "Write a 250 word story about an AI that discovers the meaning of friendship through a series of small interactions with humans. Be concise but meaningful.";

  console.log("\n🚀 Starting streaming example with prompt:", prompt);

  console.log("\n📝 Non-streaming version (waiting for full response):");
  const finalResult = await gsx.execute<string>(
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <ChatCompletion
        model="gpt-4o-mini"
        messages={[{ role: "user", content: prompt }]}
      />
    </OpenAIProvider>,
  );
  console.log("✅ Complete response:", finalResult);

  console.log("\n📝 Streaming version (processing tokens as they arrive):");
  const response = await gsx.execute<Streamable>(
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <ChatCompletion
        model="gpt-4o-mini"
        stream={true}
        messages={[{ role: "user", content: prompt }]}
      />
    </OpenAIProvider>,
  );

  for await (const token of response) {
    process.stdout.write(token);
  }
  process.stdout.write("\n");
  console.log("✅ Streaming complete");
}

const GeneratorComponent = gsx.StreamComponent<{
  foo: string;
  iterations: number;
}>("GeneratorComponent", async function* ({ foo, iterations }) {
  await setTimeout(10);
  for (let i = 1; i < iterations + 1; i++) {
    console.log("🔥 GeneratorComponent", i);
    yield `${i}: ${foo.repeat(i)}\n`;
    await setTimeout(10);
  }
});

async function streamingGeneratorExample() {
  console.log("⚡️ StreamingGeneratorExample - return result from generator");
  const response1 = await gsx.execute<string>(
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <GeneratorComponent foo="bar" iterations={10} />
    </OpenAIProvider>,
  );
  console.log(`✅ Streaming complete:\n====\n${response1}====`);
  console.log("⚡️ StreamingGeneratorExample - process generator result");
  await gsx.execute<string>(
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <GeneratorComponent stream={true} foo="bar" iterations={10}>
        {async (response: Streamable) => {
          for await (const token of response) {
            process.stdout.write(token);
          }
          process.stdout.write("\n");
          console.log("✅ Streaming complete");
        }}
      </GeneratorComponent>
    </OpenAIProvider>,
  );
}

// Main function to run examples
async function main() {
  await runStreamingWithChildrenExample();
  await runStreamingExample();
  await streamingGeneratorExample();
}

main().catch(console.error);
