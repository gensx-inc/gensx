/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import * as gensx from "@gensx/core";
import { GSXToolParams } from "@gensx/core";
import { ChatCompletion } from "openai/resources/chat/completions";
import { expect, suite, test, vi } from "vitest";
import { z } from "zod";

import { OpenAIChatCompletion, OpenAIProvider } from "../src/openai.js";
import { StructuredOutput } from "../src/structured-output.js";
import { GSXTool } from "../src/tools.js";

// Mock OpenAI client
vi.mock("openai", () => {
  const createMockChatCompletion = (
    content: string,
    toolCalls?: {
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }[],
  ) => ({
    id: "mock-completion-id",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content,
          tool_calls: toolCalls,
        },
        finish_reason: toolCalls ? "tool_calls" : "stop",
      },
    ],
    created: Date.now(),
    model: "gpt-4",
    object: "chat.completion",
  });

  class MockOpenAI {
    baseURL: string;

    constructor(options: { baseURL?: string }) {
      this.baseURL = options.baseURL ?? "https://api.openai.com/v1";
    }

    chat = {
      completions: {
        create: vi
          .fn()
          .mockImplementation((params: Record<string, unknown>) => {
            // Check if this is a request for structured output
            if (
              Array.isArray(params.tools) &&
              params.tools.some(
                (t: Record<string, unknown>) =>
                  t.function &&
                  typeof t.function === "object" &&
                  (t.function as Record<string, unknown>).name ===
                    "output_schema",
              )
            ) {
              // If there's a tool_result in the messages, return a final output
              if (
                Array.isArray(params.messages) &&
                params.messages.some(
                  (m: Record<string, unknown>) =>
                    m.role === "tool" &&
                    m.content &&
                    typeof m.content === "string",
                )
              ) {
                return Promise.resolve(
                  createMockChatCompletion("", [
                    {
                      id: "call_123",
                      type: "function",
                      function: {
                        name: "output_schema",
                        arguments: JSON.stringify({
                          output: {
                            name: "Test User",
                            age: 30,
                            isActive: true,
                          },
                        }),
                      },
                    },
                  ]),
                );
              }
              // First call with output_schema tool, return a tool call for a different tool first
              else if (
                params.tools.some(
                  (t: Record<string, unknown>) =>
                    t.function &&
                    typeof t.function === "object" &&
                    (t.function as Record<string, unknown>).name !==
                      "output_schema",
                )
              ) {
                return Promise.resolve(
                  createMockChatCompletion("", [
                    {
                      id: "call_123",
                      type: "function",
                      function: {
                        name: "test_tool",
                        arguments: JSON.stringify({ input: "test" }),
                      },
                    },
                  ]),
                );
              }
              // Direct call to output_schema
              else {
                return Promise.resolve(
                  createMockChatCompletion("", [
                    {
                      id: "call_123",
                      type: "function",
                      function: {
                        name: "output_schema",
                        arguments: JSON.stringify({
                          output: {
                            name: "Test User",
                            age: 30,
                            isActive: true,
                          },
                        }),
                      },
                    },
                  ]),
                );
              }
            }
            // For OpenAI/Azure with response_format
            else if (
              params.response_format &&
              typeof params.response_format === "object" &&
              (params.response_format as Record<string, unknown>).type ===
                "json_object"
            ) {
              return Promise.resolve(
                createMockChatCompletion(
                  JSON.stringify({
                    name: "Test User",
                    age: 30,
                    isActive: true,
                  }),
                ),
              );
            }
            // Regular response
            else {
              return Promise.resolve(createMockChatCompletion("Hello World"));
            }
          }),
      },
    };
  }

  return {
    default: MockOpenAI,
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

  test("StructuredOutput returns structured output with OpenAI", async () => {
    const TestComponent = gensx.Component<{}, User>("TestComponent", () => (
      <StructuredOutput
        model="gpt-4"
        messages={[{ role: "user", content: "Get me user data" }]}
        outputSchema={userSchema}
        max_tokens={1000}
      />
    ));

    const result = await gensx.execute<User>(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result).toEqual({
      name: "Test User",
      age: 30,
      isActive: true,
    });
  });

  test("StructuredOutput works with tools with OpenAI", async () => {
    const TestComponent = gensx.Component<{}, User>("TestComponent", () => (
      <StructuredOutput
        model="gpt-4"
        messages={[{ role: "user", content: "Get me user data" }]}
        outputSchema={userSchema}
        tools={[testTool]}
        max_tokens={1000}
      />
    ));

    const result = await gensx.execute<User>(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result).toEqual({
      name: "Test User",
      age: 30,
      isActive: true,
    });
  });

  test("StructuredOutput works with GSXToolParams with OpenAI", async () => {
    const TestComponent = gensx.Component<{}, User>("TestComponent", () => (
      <StructuredOutput
        model="gpt-4"
        messages={[{ role: "user", content: "Get me user data" }]}
        outputSchema={userSchema}
        tools={[testToolParams]}
        max_tokens={1000}
      />
    ));

    const result = await gensx.execute<User>(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result).toEqual({
      name: "Test User",
      age: 30,
      isActive: true,
    });
  });

  test("StructuredOutput returns structured output with non-OpenAI provider", async () => {
    const TestComponent = gensx.Component<{}, User>("TestComponent", () => (
      <StructuredOutput
        model="gpt-4"
        messages={[{ role: "user", content: "Get me user data" }]}
        outputSchema={userSchema}
        max_tokens={1000}
      />
    ));

    const result = await gensx.execute<User>(
      <OpenAIProvider apiKey="test" baseURL="https://api.other-provider.com/v1">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result).toEqual({
      name: "Test User",
      age: 30,
      isActive: true,
    });
  });

  test("StructuredOutput works with tools with non-OpenAI provider", async () => {
    const TestComponent = gensx.Component<{}, User>("TestComponent", () => (
      <StructuredOutput
        model="gpt-4"
        messages={[{ role: "user", content: "Get me user data" }]}
        outputSchema={userSchema}
        tools={[testTool]}
        max_tokens={1000}
      />
    ));

    const result = await gensx.execute<User>(
      <OpenAIProvider apiKey="test" baseURL="https://api.other-provider.com/v1">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result).toEqual({
      name: "Test User",
      age: 30,
      isActive: true,
    });
  });

  test("StructuredOutput works with Azure OpenAI", async () => {
    const TestComponent = gensx.Component<{}, User>("TestComponent", () => (
      <StructuredOutput
        model="gpt-4"
        messages={[{ role: "user", content: "Get me user data" }]}
        outputSchema={userSchema}
        max_tokens={1000}
      />
    ));

    const result = await gensx.execute<User>(
      <OpenAIProvider
        apiKey="test"
        baseURL="https://my-resource.openai.azure.com/openai/deployments/my-deployment"
      >
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result).toEqual({
      name: "Test User",
      age: 30,
      isActive: true,
    });
  });

  test("StructuredOutput with useToolsForStructuredOutput=true forces tools with OpenAI", async () => {
    const TestComponent = gensx.Component<{}, User>("TestComponent", () => (
      <StructuredOutput
        model="gpt-4"
        messages={[{ role: "user", content: "Get me user data" }]}
        outputSchema={userSchema}
        useToolsForStructuredOutput="true"
        max_tokens={1000}
      />
    ));

    const result = await gensx.execute<User>(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result).toEqual({
      name: "Test User",
      age: 30,
      isActive: true,
    });
  });

  test("StructuredOutput with useToolsForStructuredOutput=false forces response_format with non-OpenAI", async () => {
    const TestComponent = gensx.Component<{}, User>("TestComponent", () => (
      <StructuredOutput
        model="gpt-4"
        messages={[{ role: "user", content: "Get me user data" }]}
        outputSchema={userSchema}
        useToolsForStructuredOutput="false"
        max_tokens={1000}
      />
    ));

    const result = await gensx.execute<User>(
      <OpenAIProvider apiKey="test" baseURL="https://api.other-provider.com/v1">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result).toEqual({
      name: "Test User",
      age: 30,
      isActive: true,
    });
  });

  test("OpenAIChatCompletion with outputSchema returns structured output", async () => {
    const TestComponent = gensx.Component<{}, ChatCompletion>(
      "TestComponent",
      () => (
        <OpenAIChatCompletion
          model="gpt-4"
          messages={[{ role: "user", content: "Get me user data" }]}
          response_format={{ type: "json_object" }}
          max_tokens={1000}
        />
      ),
    );

    const result = await gensx.execute<ChatCompletion>(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result.choices[0].message.content).toBeDefined();
    const content = result.choices[0].message.content;
    if (content) {
      const parsed = JSON.parse(content);
      expect(parsed).toEqual({
        name: "Test User",
        age: 30,
        isActive: true,
      });
    }
  });
});
