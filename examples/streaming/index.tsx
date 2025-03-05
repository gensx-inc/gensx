import * as gensx from "@gensx/core";
import { ChatCompletion, OpenAIProvider } from "@gensx/openai";

function isAsyncIterable(obj: unknown): obj is AsyncIterable<unknown> {
  return obj != null && typeof obj === "object" && Symbol.asyncIterator in obj;
}

const StreamStory = gensx.StreamComponent<{ prompt: string }>(
  "StreamStory",
  ({ prompt, stream }) => {
    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <ChatCompletion
          model="gpt-4o-mini"
          stream={stream}
          messages={[{ role: "user", content: prompt }]}
        />
      </OpenAIProvider>
    );
  },
);

interface StreamResponse {
  children?: (
    response: string | gensx.Streamable,
  ) => gensx.MaybePromise<string | undefined>;
}

const StreamStoryWithChildren = gensx.StreamComponent<
  { prompt: string } & StreamResponse
>("StreamStoryWithChildren", ({ prompt, stream = false }) => {
  return (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <ChatCompletion
        model="gpt-4o-mini"
        stream={stream}
        messages={[{ role: "user", content: prompt }]}
      >
        {(response: string | gensx.Streamable) => {
          if (stream && isAsyncIterable(response)) {
            void (async () => {
              for await (const token of response as gensx.Streamable) {
                process.stdout.write(token);
              }
              process.stdout.write("\n");
              console.log("✅ Streaming complete");
            })();
            return "";
          } else {
            console.log(response);
            return response as string;
          }
        }}
      </ChatCompletion>
    </OpenAIProvider>
  );
});

interface GeneratorProps {
  foo: string;
  iterations: number;
  stream?: boolean;
  children?: (
    response: gensx.Streamable,
  ) => gensx.MaybePromise<string | undefined>;
}

const GeneratorWorkflow = gensx.Component<GeneratorProps, string>(
  "GeneratorWorkflow",
  ({ foo, iterations, stream = false }) => {
    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <GeneratorComponent stream={stream} foo={foo} iterations={iterations}>
          {(output: string | gensx.Streamable) => {
            if (stream && isAsyncIterable(output)) {
              void (async () => {
                for await (const token of output as gensx.Streamable) {
                  process.stdout.write(token);
                }
                process.stdout.write("\n");
                console.log("✅ Streaming complete");
              })();
              return "";
            }
            return output as string;
          }}
        </GeneratorComponent>
      </OpenAIProvider>
    );
  },
);

const GeneratorComponent = gensx.StreamComponent<{
  foo: string;
  iterations: number;
}>("GeneratorComponent", function* ({ foo, iterations }) {
  for (let i = 1; i < iterations + 1; i++) {
    console.log("🔥 GeneratorComponent", i);
    yield `${i}: ${foo.repeat(i)}\n`;
  }
});

async function runStreamingWithChildrenExample() {
  const prompt =
    "Write a 250 word story about an AI that discovers the meaning of friendship through a series of small interactions with humans. Be concise but meaningful.";

  console.log("\n🚀 Starting streaming example with prompt:", prompt);

  const workflow = gensx.Workflow(
    "StreamingStoryWithChildrenWorkflow",
    StreamStoryWithChildren,
    { printUrl: true },
  );

  console.log("\n📝 Non-streaming version (waiting for full response):");
  await workflow.run({ prompt, stream: false });

  console.log("\n📝 Streaming version (processing tokens as they arrive):");
  await workflow.run({ prompt, stream: true });
}

async function runStreamingExample() {
  const prompt =
    "Write a 250 word story about an AI that discovers the meaning of friendship through a series of small interactions with humans. Be concise but meaningful.";

  console.log("\n🚀 Starting streaming example with prompt:", prompt);

  const workflow = gensx.Workflow("StreamStoryWorkflow", StreamStory, {
    printUrl: true,
  });

  console.log("\n📝 Non-streaming version (waiting for full response):");
  const finalResult = await workflow.run({ prompt });
  console.log("✅ Complete response:", finalResult);

  console.log("\n📝 Streaming version (processing tokens as they arrive):");
  const response = await workflow.run(
    { prompt, stream: true },
    { printUrl: true },
  );

  for await (const token of response) {
    process.stdout.write(token);
  }
  process.stdout.write("\n");
  console.log("✅ Streaming complete");
}

async function streamingGeneratorExample() {
  const workflow = gensx.Workflow("GeneratorWorkflow", GeneratorWorkflow);

  console.log("⚡️ StreamingGeneratorExample - return result from generator");
  const response1 = await workflow.run({ foo: "bar", iterations: 10 });
  console.log(`✅ Streaming complete:\n====\n${response1}====`);

  console.log("⚡️ StreamingGeneratorExample - process generator result");
  await workflow.run({ foo: "bar", iterations: 10, stream: true });
}

// Main function to run examples
async function main() {
  await runStreamingWithChildrenExample();
  await runStreamingExample();
  await streamingGeneratorExample();
}

main().catch(console.error);
