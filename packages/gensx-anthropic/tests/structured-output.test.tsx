import { MessageCreateParams } from "@anthropic-ai/sdk/resources/messages";
import * as gensx from "@gensx/core";
import { expect, suite, test, vi } from "vitest";
import { z } from "zod";

import {
  AnthropicProvider,
  GSXChatCompletion,
  GSXTool,
  GSXToolParams,
} from "@/index.js";
import { StructuredOutput } from "@/structured-output.js";

import {
  createMockMessage,
  createMockMessageWithToolUse,
  createMockTextContent,
} from "./helpers.js";

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
        // Check if this is a request for structured output
        if (params.tools?.some((t) => t.name === "output_schema")) {
          // If there's a tool_result in the messages, return a final output
          if (
            params.messages.some(
              (m) =>
                typeof m.content === "object" &&
                Array.isArray(m.content) &&
                m.content.some((c) => c.type === "tool_result"),
            )
          ) {
            return Promise.resolve(
              createMockMessageWithToolUse("output_schema", {
                output: {
                  name: "Test User",
                  age: 30,
                  isActive: true,
                },
              }),
            );
          }
          // First call with output_schema tool, return a tool call for a different tool first
          else if (params.tools.some((t) => t.name !== "output_schema")) {
            return Promise.resolve(
              createMockMessageWithToolUse("test_tool", { input: "test" }),
            );
          }
          // Direct call to output_schema
          else {
            return Promise.resolve(
              createMockMessageWithToolUse("output_schema", {
                output: {
                  name: "Test User",
                  age: 30,
                  isActive: true,
                },
              }),
            );
          }
        }
        // Regular response
        else {
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    default: MockAnthropicClass,
  };
});

suite("StructuredOutput", () => {
  // Define a test schema
  const userSchema = z.object({
    name: z.string(),
    age: z.number(),
    isActive: z.boolean(),
  });

  type User = z.infer<typeof userSchema>;

  // Create a test tool
  const testToolSchema = z.object({
    input: z.string(),
  });

  const testToolParams: GSXToolParams<typeof testToolSchema> = {
    name: "test_tool",
    description: "A test tool",
    schema: testToolSchema,
    run: async (args) => {
      await Promise.resolve();
      return `Processed: ${args.input}`;
    },
  };

  const testTool = new GSXTool(testToolParams);

  test("StructuredOutput returns structured output", async () => {
    const TestComponent = gensx.Component<{}, User>("TestComponent", () => (
      <StructuredOutput
        model="claude-3-5-sonnet-latest"
        messages={[{ role: "user", content: "Get me user data" }]}
        outputSchema={userSchema}
        max_tokens={1000}
      />
    ));

    const result = await gensx.execute<User>(
      <AnthropicProvider apiKey="test">
        <TestComponent />
      </AnthropicProvider>,
    );

    expect(result).toEqual({
      name: "Test User",
      age: 30,
      isActive: true,
    });
  });

  test("StructuredOutput works with tools", async () => {
    const TestComponent = gensx.Component<{}, User>("TestComponent", () => (
      <StructuredOutput
        model="claude-3-5-sonnet-latest"
        messages={[{ role: "user", content: "Get me user data" }]}
        outputSchema={userSchema}
        tools={[testTool]}
        max_tokens={1000}
      />
    ));

    const result = await gensx.execute<User>(
      <AnthropicProvider apiKey="test">
        <TestComponent />
      </AnthropicProvider>,
    );

    expect(result).toEqual({
      name: "Test User",
      age: 30,
      isActive: true,
    });
  });

  test("StructuredOutput works with GSXToolParams", async () => {
    const TestComponent = gensx.Component<{}, User>("TestComponent", () => (
      <StructuredOutput
        model="claude-3-5-sonnet-latest"
        messages={[{ role: "user", content: "Get me user data" }]}
        outputSchema={userSchema}
        tools={[testToolParams]}
        max_tokens={1000}
      />
    ));

    const result = await gensx.execute<User>(
      <AnthropicProvider apiKey="test">
        <TestComponent />
      </AnthropicProvider>,
    );

    expect(result).toEqual({
      name: "Test User",
      age: 30,
      isActive: true,
    });
  });

  test("GSXChatCompletion with outputSchema returns structured output", async () => {
    const TestComponent = gensx.Component<{}, User>("TestComponent", () => (
      <GSXChatCompletion
        model="claude-3-5-sonnet-latest"
        messages={[{ role: "user", content: "Get me user data" }]}
        outputSchema={userSchema}
        max_tokens={1000}
      />
    ));

    const result = await gensx.execute<User>(
      <AnthropicProvider apiKey="test">
        <TestComponent />
      </AnthropicProvider>,
    );

    expect(result).toEqual({
      name: "Test User",
      age: 30,
      isActive: true,
    });
  });

  test("GSXChatCompletion with outputSchema and tools returns structured output", async () => {
    const TestComponent = gensx.Component<{}, User>("TestComponent", () => (
      <GSXChatCompletion
        model="claude-3-5-sonnet-latest"
        messages={[{ role: "user", content: "Get me user data" }]}
        outputSchema={userSchema}
        tools={[testTool]}
        max_tokens={1000}
      />
    ));

    const result = await gensx.execute<User>(
      <AnthropicProvider apiKey="test">
        <TestComponent />
      </AnthropicProvider>,
    );

    expect(result).toEqual({
      name: "Test User",
      age: 30,
      isActive: true,
    });
  });

  test("GSXChatCompletion with outputSchema and tools params returns structured output", async () => {
    const TestComponent = gensx.Component<{}, User>("TestComponent", () => (
      <GSXChatCompletion
        model="claude-3-5-sonnet-latest"
        messages={[{ role: "user", content: "Get me user data" }]}
        outputSchema={userSchema}
        tools={[testToolParams]}
        max_tokens={1000}
      />
    ));

    const result = await gensx.execute<User>(
      <AnthropicProvider apiKey="test">
        <TestComponent />
      </AnthropicProvider>,
    );

    expect(result).toEqual({
      name: "Test User",
      age: 30,
      isActive: true,
    });
  });
});
