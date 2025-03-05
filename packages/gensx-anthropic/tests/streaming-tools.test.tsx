import * as gensx from "@gensx/core";
import { expect, suite, test, vi } from "vitest";
import { z } from "zod";

import {
  AnthropicProvider,
  GSXChatCompletion,
  GSXTool,
  GSXToolParams,
} from "@/index.js";

// Mock Anthropic client
vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const originalAnthropicModule: Awaited<typeof import("@anthropic-ai/sdk")> =
    await importOriginal();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockAnthropicClass: any = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  MockAnthropicClass.prototype = {
    messages: {
      create: vi.fn().mockImplementation(() => {
        return Promise.resolve({
          id: "msg_123",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "Test response", citations: [] }],
          model: "claude-3-5-sonnet-latest",
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: {
            input_tokens: 10,
            output_tokens: 20,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
          },
        });
      }),
    },
  };

  return {
    ...originalAnthropicModule,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    default: MockAnthropicClass,
  };
});

suite("GSXChatCompletion with tools and streaming", () => {
  const schema = z.object({
    input: z.string(),
  });

  // Create a mock tool for testing
  const mockToolParams: GSXToolParams<typeof schema> = {
    name: "test_tool",
    description: "A test tool",
    schema,
    run: async (args) => {
      await Promise.resolve();
      return { result: args.input };
    },
  };

  const mockTool = GSXTool.create(mockToolParams);

  test("throws error when tools and streaming are used together", async () => {
    // We need to bypass TypeScript's type checking to test the runtime error
    // This simulates what would happen if someone tried to bypass the type system
    const props = {
      stream: true,
      tools: [mockTool],
      model: "claude-3-5-sonnet-latest",
      messages: [{ role: "user", content: "test" }],
      max_tokens: 1000,
    };

    const TestComponent = gensx.Component<{}, unknown>("TestComponent", () => (
      // @ts-expect-error - Intentionally bypassing type checking to test runtime error
      <GSXChatCompletion {...props} />
    ));

    await expect(() =>
      gensx.execute(
        <AnthropicProvider apiKey="test">
          <TestComponent />
        </AnthropicProvider>,
      ),
    ).rejects.toThrow(
      "Tools cannot be used with streaming. Please use either tools or streaming, but not both.",
    );
  });

  test("works with tools when streaming is false", async () => {
    const TestComponent = gensx.Component<{}, unknown>("TestComponent", () => (
      <GSXChatCompletion
        stream={false}
        tools={[mockTool]}
        model="claude-3-5-sonnet-latest"
        messages={[{ role: "user", content: "test" }]}
        max_tokens={1000}
      />
    ));

    await expect(
      gensx.execute(
        <AnthropicProvider apiKey="test">
          <TestComponent />
        </AnthropicProvider>,
      ),
    ).resolves.not.toThrow();
  });

  test("works with tool params when streaming is false", async () => {
    const TestComponent = gensx.Component<{}, unknown>("TestComponent", () => (
      <GSXChatCompletion
        stream={false}
        tools={[mockToolParams]}
        model="claude-3-5-sonnet-latest"
        messages={[{ role: "user", content: "test" }]}
        max_tokens={1000}
      />
    ));

    await expect(
      gensx.execute(
        <AnthropicProvider apiKey="test">
          <TestComponent />
        </AnthropicProvider>,
      ),
    ).resolves.not.toThrow();
  });

  test("works with streaming when tools are not provided", async () => {
    const TestComponent = gensx.Component<{}, unknown>("TestComponent", () => (
      <GSXChatCompletion
        stream={true}
        model="claude-3-5-sonnet-latest"
        messages={[{ role: "user", content: "test" }]}
        max_tokens={1000}
      />
    ));

    await expect(
      gensx.execute(
        <AnthropicProvider apiKey="test">
          <TestComponent />
        </AnthropicProvider>,
      ),
    ).resolves.not.toThrow();
  });

  test("type error when trying to use tools with streaming", () => {
    // @ts-expect-error - Type error: tools cannot be used with streaming
    <GSXChatCompletion
      stream={true}
      tools={[mockTool]} // Type error: tools cannot be used with streaming
      model="claude-3-5-sonnet-latest"
      messages={[{ role: "user", content: "test" }]}
      max_tokens={1000}
    />;

    expect(true).toBe(true);
  });
});
