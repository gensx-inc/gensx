import { gsx } from "gensx";
import {
  ChatCompletionChunk,
  ChatCompletionCreateParams,
} from "openai/resources/index.mjs";
import { Stream } from "openai/streaming.mjs";
import { expect, suite, test, vi } from "vitest";

import { GSXChatCompletion } from "@/gsx-completion";
import { GSXChatCompletionResult } from "@/gsx-completion";
import { OpenAIProvider } from "@/index";

import { createMockChatCompletionChunks } from "./helpers";

vi.mock("openai", async (importOriginal) => {
  const originalOpenAI: Awaited<typeof import("openai")> =
    await importOriginal();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockedOpenAIClass: any = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  mockedOpenAIClass.prototype = {
    chat: {
      completions: {
        create: vi
          .fn()
          .mockImplementation((params: ChatCompletionCreateParams) => {
            if (params.stream) {
              const chunks = createMockChatCompletionChunks("Hello World");
              return Promise.resolve({
                [Symbol.asyncIterator]: async function* () {
                  for (const chunk of chunks) {
                    await Promise.resolve();
                    yield chunk;
                  }
                },
              });
            } else {
              return Promise.resolve({
                choices: [{ message: { content: "Hello World" } }],
              });
            }
          }),
      },
    },
  };

  return {
    ...originalOpenAI,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    default: mockedOpenAIClass,
  };
});

suite("GSXChatCompletion", () => {
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
