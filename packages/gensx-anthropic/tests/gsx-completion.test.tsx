import Anthropic from "@anthropic-ai/sdk";
import {
  MessageCreateParams,
  RawMessageStreamEvent,
} from "@anthropic-ai/sdk/resources/messages";
import { Stream } from "@anthropic-ai/sdk/streaming";
import * as gensx from "@gensx/core";
import { expect, suite, test, vi } from "vitest";

import { GSXChatCompletionResult } from "../src/gsx-completion.js";
import { AnthropicProvider, GSXChatCompletion } from "../src/index.js";
import { createMockMessage, createMockTextContent } from "./helpers.js";
import { createMockStreamEvents } from "./helpers.js";

// Mock Anthropic client
vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const originalAnthropicModule: Awaited<typeof import("@anthropic-ai/sdk")> =
    await importOriginal();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockAnthropicClass: any = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  MockAnthropicClass.prototype = {
    messages: {
      create: vi.fn().mockImplementation((params: MessageCreateParams) => {
        if (params.stream === true) {
          return Promise.resolve(createMockStreamEvents("Hello World"));
        } else {
          return Promise.resolve(
            createMockMessage({
              content: createMockTextContent("Hello World"),
            }),
          );
        }
      }),
    },
  };

  return {
    ...originalAnthropicModule,
    default: MockAnthropicClass as unknown as Anthropic,
    Anthropic: MockAnthropicClass as unknown as Anthropic,
  };
});

suite("GSXChatCompletion", () => {
  test("passes a stream to a child function", async () => {
    const Wrapper = gensx.Component<{}, string>("Wrapper", () => {
      return (
        <GSXChatCompletion
          model="claude-3-5-sonnet-latest"
          messages={[{ role: "user", content: "test" }]}
          stream={true}
          max_tokens={1000}
        >
          {async (stream) => {
            let result = "";
            for await (const chunk of stream) {
              if (
                chunk.type === "content_block_delta" &&
                chunk.delta.type === "text_delta"
              ) {
                result += chunk.delta.text;
              }
            }
            return result;
          }}
        </GSXChatCompletion>
      );
    });

    const result = await gensx.execute<string>(
      <AnthropicProvider apiKey="test">
        <Wrapper />
      </AnthropicProvider>,
    );

    expect(result).toBe("Hello World ");
  });

  test("passes a standard response to a child function", async () => {
    const Wrapper = gensx.Component<{}, string>("Wrapper", () => {
      return (
        <GSXChatCompletion
          model="claude-3-5-sonnet-latest"
          messages={[{ role: "user", content: "test" }]}
          max_tokens={1000}
        >
          {(result) => {
            const textBlock = result.content.find(
              (block) => block.type === "text",
            );
            return textBlock?.text ?? "";
          }}
        </GSXChatCompletion>
      );
    });

    const result = await gensx.execute<string>(
      <AnthropicProvider apiKey="test">
        <Wrapper />
      </AnthropicProvider>,
    );

    expect(result).toBe("Hello World");
  });

  test("returns a stream", async () => {
    const Wrapper = gensx.Component<{}, Stream<RawMessageStreamEvent>>(
      "Wrapper",
      async () => {
        const stream = await GSXChatCompletion.run({
          model: "claude-3-5-sonnet-latest",
          messages: [{ role: "user", content: "test" }],
          stream: true,
          max_tokens: 1000,
        });

        return stream;
      },
    );

    const result = await gensx.execute<Stream<RawMessageStreamEvent>>(
      <AnthropicProvider apiKey="test">
        <Wrapper />
      </AnthropicProvider>,
    );

    let resultString = "";
    for await (const chunk of result) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        resultString += chunk.delta.text;
      }
    }

    expect(resultString).toBe("Hello World ");
  });

  test("returns a standard response", async () => {
    const Wrapper = gensx.Component<{}, GSXChatCompletionResult>(
      "Wrapper",
      async () => {
        const result = await GSXChatCompletion.run({
          model: "claude-3-5-sonnet-latest",
          messages: [{ role: "user", content: "test" }],
          max_tokens: 1000,
        });

        return result;
      },
    );

    const result = await gensx.execute<GSXChatCompletionResult>(
      <AnthropicProvider apiKey="test">
        <Wrapper />
      </AnthropicProvider>,
    );

    // Verify specific properties instead of the entire object structure
    expect(result.type).toBe("message");
    expect(result.role).toBe("assistant");
    expect(result.model).toBe("claude-3-5-sonnet-latest");

    // Check content array
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0].type).toBe("text");

    // Type guard to ensure we can access the text property
    if (result.content[0].type === "text") {
      expect(result.content[0].text).toBe("Hello World");
    }

    // Check messages array
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.messages.length).toBe(2);
    expect(result.messages[0].role).toBe("user");
    expect(result.messages[0].content).toBe("test");
    expect(result.messages[1].role).toBe("assistant");
    expect(Array.isArray(result.messages[1].content)).toBe(true);
  });
});
