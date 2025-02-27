import { gsx } from "gensx";
import { ChatCompletionChunk } from "openai/resources/index.mjs";
import { Stream } from "openai/streaming.mjs";
import { expect, suite, test } from "vitest";

import { GSXChatCompletionResult } from "@/gsx-completion";
import { GSXChatCompletion, OpenAIProvider } from "@/index";

suite("GSXChatCompletion", () => {
  test("passes a stream to a child function", async () => {
    const Wrapper = gsx.Component<{}, string>("Wrapper", () => {
      return (
        <GSXChatCompletion
          model="gpt-4o"
          messages={[{ role: "user", content: "test" }]}
          stream={true}
        >
          {async (stream) => {
            let result = "";
            for await (const chunk of stream) {
              result += chunk.choices[0].delta.content ?? "";
            }
            return result;
          }}
        </GSXChatCompletion>
      );
    });

    const result = await gsx.execute<string>(
      <OpenAIProvider apiKey="test">
        <Wrapper />
      </OpenAIProvider>,
    );

    expect(result).toBe("Hello World ");
  });

  test("passes a standard response to a child function", async () => {
    const Wrapper = gsx.Component<{}, string>("Wrapper", () => {
      return (
        <GSXChatCompletion
          model="gpt-4o"
          messages={[{ role: "user", content: "test" }]}
        >
          {(result) => result.choices[0].message.content}
        </GSXChatCompletion>
      );
    });

    const result = await gsx.execute<string>(
      <OpenAIProvider apiKey="test">
        <Wrapper />
      </OpenAIProvider>,
    );

    expect(result).toBe("Hello World");
  });

  test("returns a stream", async () => {
    const Wrapper = gsx.Component<{}, Stream<ChatCompletionChunk>>(
      "Wrapper",
      async () => {
        const stream = await GSXChatCompletion.run({
          model: "gpt-4o",
          messages: [{ role: "user", content: "test" }],
          stream: true,
        });

        return stream;
      },
    );

    const result = await gsx.execute<Stream<ChatCompletionChunk>>(
      <OpenAIProvider apiKey="test">
        <Wrapper />
      </OpenAIProvider>,
    );

    let resultString = "";
    for await (const chunk of result) {
      resultString += chunk.choices[0].delta.content ?? "";
    }

    expect(resultString).toBe("Hello World ");
  });

  test("returns a standard response", async () => {
    const Wrapper = gsx.Component<{}, GSXChatCompletionResult>(
      "Wrapper",
      async () => {
        const result = await GSXChatCompletion.run({
          model: "gpt-4o",
          messages: [{ role: "user", content: "test" }],
        });

        return result;
      },
    );

    const result = await gsx.execute<GSXChatCompletionResult>(
      <OpenAIProvider apiKey="test">
        <Wrapper />
      </OpenAIProvider>,
    );

    expect(result).toEqual({
      messages: [{ role: "user", content: "test" }, { content: "Hello World" }],
      choices: [{ message: { content: "Hello World" } }],
    });
  });
});
