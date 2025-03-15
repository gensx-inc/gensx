import * as gensx from "@gensx/core";
import {
  ChatCompletion as ChatCompletionOutput,
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/index.mjs";
import { expect, suite, test } from "vitest";
import { z } from "zod";

import {
  GSXChatCompletion,
  GSXChatCompletionResult,
  GSXTool,
  GSXToolProps,
  OpenAIProvider,
} from "@/index.js";
import { ToolExecutor, ToolsCompletion } from "@/tools.js";

suite("Tools", () => {
  // Create a test tool
  const testToolSchema = z.object({
    input: z.string(),
  });

  const testToolParams: GSXToolProps<typeof testToolSchema> = {
    name: "test_tool",
    description: "A test tool",
    schema: testToolSchema,
    run: async (args) => {
      await Promise.resolve();
      return `Processed: ${args.input}`;
    },
  };

  const testTool = GSXTool.create(testToolParams);

  test("GSXTool creation and definition", () => {
    expect(testTool.name).toBe("test_tool");
    expect(testTool.description).toBe("A test tool");
    expect(testTool.type).toBe("function");
    expect(testTool.definition.type).toBe("function");
    expect(testTool.definition.function.name).toBe("test_tool");
  });

  test("GSXTool execution", async () => {
    const result = await testTool.run({ input: "test" });
    expect(result).toBe("Processed: test");
  });

  test("ToolExecutor executes tools correctly", async () => {
    const TestComponent = gensx.Component<{}, ChatCompletionToolMessageParam[]>(
      "TestComponent",
      () => (
        <ToolExecutor
          tools={[testTool]}
          toolCalls={[
            {
              id: "call_1",
              type: "function" as const,
              function: {
                name: "test_tool",
                arguments: JSON.stringify({ input: "test" }),
              },
            },
          ]}
        />
      ),
    );

    const result = await gensx.execute<ChatCompletionToolMessageParam[]>(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result).toHaveLength(1);
    expect(result[0].tool_call_id).toBe("call_1");
    expect(result[0].role).toBe("tool");
    expect(result[0].content).toBe("Processed: test");
  });

  test("ToolsCompletion handles tool-based conversation", async () => {
    const TestComponent = gensx.Component<{}, ChatCompletionOutput>(
      "TestComponent",
      () => (
        <ToolsCompletion
          model="gpt-4"
          messages={[{ role: "user", content: "test" }]}
          tools={[testTool]}
        />
      ),
    );

    const result = await gensx.execute<ChatCompletionOutput>(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result.choices[0].message.content).toBe(
      "Final answer after tool execution",
    );
  });

  test("GSXChatCompletion returns complete message history", async () => {
    const initialMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: "You are a test assistant" },
      { role: "user", content: "test message" },
    ];

    const TestComponent = gensx.Component<{}, GSXChatCompletionResult>(
      "TestComponent",
      () => (
        <GSXChatCompletion
          model="gpt-4o"
          messages={initialMessages}
          tools={[testTool]}
        />
      ),
    );

    const result = await gensx.execute<GSXChatCompletionResult>(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    // Verify messages array exists and contains the complete conversation
    expect(result.messages).toBeDefined();
    expect(result.messages).toHaveLength(5); // Initial 2 + Assistant tool call + Tool response + Final response

    // Check initial messages
    expect(result.messages[0]).toEqual(initialMessages[0]);
    expect(result.messages[1]).toEqual(initialMessages[1]);

    // Check tool call message
    const toolCallMessage = result
      .messages[2] as ChatCompletionAssistantMessageParam;
    expect(toolCallMessage.role).toBe("assistant");
    expect(toolCallMessage.tool_calls).toBeDefined();
    expect(toolCallMessage.tool_calls).toHaveLength(1);
    const toolCall = toolCallMessage.tool_calls![0];
    expect(toolCall.function.name).toBe("test_tool");

    // Check tool response
    expect(result.messages[3].role).toBe("tool");
    expect(result.messages[3].content).toBe("Processed: test");

    // Check final response
    expect(result.messages[4].role).toBe("assistant");
    expect(result.messages[4].content).toBe(
      "Final answer after tool execution",
    );
  });

  test("GSXChatCompletion works with tools", async () => {
    const TestComponent = gensx.Component<{}, ChatCompletionOutput>(
      "TestComponent",
      () => (
        <GSXChatCompletion
          model="gpt-4o"
          messages={[{ role: "user", content: "test" }]}
          tools={[testTool]}
        />
      ),
    );

    const result = await gensx.execute<ChatCompletionOutput>(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result.choices[0].message.content).toBe(
      "Final answer after tool execution",
    );
  });

  test("GSXChatCompletion works with tool params", async () => {
    const TestComponent = gensx.Component<{}, ChatCompletionOutput>(
      "TestComponent",
      () => (
        <GSXChatCompletion
          model="gpt-4o"
          messages={[{ role: "user", content: "test" }]}
          tools={[testToolParams]}
        />
      ),
    );

    const result = await gensx.execute<ChatCompletionOutput>(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result.choices[0].message.content).toBe(
      "Final answer after tool execution",
    );
  });

  test("GSXChatCompletion works with tools and structured output", async () => {
    const TestComponent = gensx.Component<{}, ChatCompletionOutput>(
      "TestComponent",
      () => (
        <GSXChatCompletion
          model="gpt-4o"
          messages={[{ role: "user", content: "test" }]}
          tools={[testTool]}
          outputSchema={z.object({
            name: z.string(),
            age: z.number(),
          })}
        />
      ),
    );

    const result = await gensx.execute<ChatCompletionOutput>(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result).toEqual({
      name: "Hello World",
      age: 42,
    });
  });

  test("GSXChatCompletion works with tool params and structured output", async () => {
    const TestComponent = gensx.Component<{}, ChatCompletionOutput>(
      "TestComponent",
      () => (
        <GSXChatCompletion
          model="gpt-4o"
          messages={[{ role: "user", content: "test" }]}
          tools={[testToolParams]}
          outputSchema={z.object({
            name: z.string(),
            age: z.number(),
          })}
        />
      ),
    );

    const result = await gensx.execute<ChatCompletionOutput>(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result).toEqual({
      name: "Hello World",
      age: 42,
    });
  });

  test("ToolExecutor throws error for invalid tool", async () => {
    const TestComponent = gensx.Component("TestComponent", () => (
      <ToolExecutor
        tools={[testTool]}
        toolCalls={[
          {
            id: "call_1",
            type: "function" as const,
            function: {
              name: "nonexistent_tool",
              arguments: JSON.stringify({ input: "test" }),
            },
          },
        ]}
      />
    ));

    await expect(() =>
      gensx.execute(
        <OpenAIProvider apiKey="test">
          <TestComponent />
        </OpenAIProvider>,
      ),
    ).rejects.toThrow("Tool nonexistent_tool not found");
  });

  test("ToolExecutor throws error for invalid arguments", async () => {
    const TestComponent = gensx.Component("TestComponent", () => (
      <ToolExecutor
        tools={[testTool]}
        toolCalls={[
          {
            id: "call_1",
            type: "function" as const,
            function: {
              name: "test_tool",
              arguments: JSON.stringify({ invalid: "test" }),
            },
          },
        ]}
      />
    ));

    await expect(() =>
      gensx.execute(
        <OpenAIProvider apiKey="test">
          <TestComponent />
        </OpenAIProvider>,
      ),
    ).rejects.toThrow("Invalid tool arguments");
  });
});
