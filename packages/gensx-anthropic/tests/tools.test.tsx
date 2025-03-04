import {
  Message,
  MessageCreateParams,
  MessageParam,
  TextBlock,
  ToolResultBlockParam,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages";
import { gsx } from "@gensx/core";
import { expect, suite, test, vi } from "vitest";
import { z } from "zod";

import {
  AnthropicProvider,
  GSXChatCompletion,
  GSXChatCompletionResult,
  GSXTool,
} from "@/index.js";
import { ToolExecutor, ToolsCompletion } from "@/tools.js";

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
        // If there's already a tool response in the conversation, return a final answer
        if (
          params.messages.some(
            (m) =>
              typeof m.content === "object" &&
              Array.isArray(m.content) &&
              m.content.some((c) => c.type === "tool_result"),
          )
        ) {
          if (params.tools?.some((t) => t.name === "output_schema")) {
            return Promise.resolve(
              createMockMessage({
                content: createMockTextContent(
                  JSON.stringify({
                    name: "structured output after tool execution",
                    age: 42,
                  }),
                ),
              }),
            );
          } else {
            return Promise.resolve(
              createMockMessage({
                content: createMockTextContent(
                  "Final answer after tool execution",
                ),
              }),
            );
          }
        }
        // Handle initial tool calls
        else if (params.tools?.length) {
          return Promise.resolve(
            createMockMessageWithToolUse("test_tool", { input: "test" }),
          );
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    default: MockAnthropicClass,
  };
});

suite("Tools", () => {
  // Create a test tool
  const testToolSchema = z.object({
    input: z.string(),
  });

  const testTool = new GSXTool({
    name: "test_tool",
    description: "A test tool",
    schema: testToolSchema,
    run: async (args) => {
      await Promise.resolve();
      return `Processed: ${args.input}`;
    },
  });

  test("GSXTool creation and definition", () => {
    expect(testTool.name).toBe("test_tool");
    expect(testTool.description).toBe("A test tool");
    expect(testTool.type).toBe("function");
    expect(testTool.definition.name).toBe("test_tool");
    expect(testTool.definition.description).toBe("A test tool");
  });

  test("GSXTool execution", async () => {
    const result = await testTool.run({ input: "test" });
    expect(result).toBe("Processed: test");
  });

  test("ToolExecutor executes tools correctly", async () => {
    const toolUseBlock: ToolUseBlock = {
      type: "tool_use",
      id: "call_1",
      name: "test_tool",
      input: { input: "test" },
    };

    const TestComponent = gsx.Component<{}, MessageParam>(
      "TestComponent",
      () => <ToolExecutor tools={[testTool]} toolCalls={[toolUseBlock]} />,
    );

    const result = await gsx.execute<MessageParam>(
      <AnthropicProvider apiKey="test">
        <TestComponent />
      </AnthropicProvider>,
    );

    expect(result.role).toBe("user");
    expect(Array.isArray(result.content)).toBe(true);

    let toolResult = result.content[0] as ToolResultBlockParam;
    expect(toolResult.type).toBe("tool_result");
    expect(toolResult.tool_use_id).toBe("call_1");
    expect(toolResult.content).toBe("Processed: test");
  });

  test("ToolsCompletion handles tool-based conversation", async () => {
    const TestComponent = gsx.Component<{}, Message>("TestComponent", () => (
      <ToolsCompletion
        model="claude-3-5-sonnet-latest"
        messages={[{ role: "user", content: "test" }]}
        tools={[testTool]}
        max_tokens={1000}
      />
    ));

    const result = await gsx.execute<Message>(
      <AnthropicProvider apiKey="test">
        <TestComponent />
      </AnthropicProvider>,
    );

    // Check that we get the final answer
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0].type).toBe("text");
    const textBlock = result.content[0] as TextBlock;
    expect(textBlock.text).toBe("Final answer after tool execution");
  });

  test("GSXChatCompletion returns complete message history", async () => {
    const initialMessages: MessageParam[] = [
      { role: "user", content: "test message" },
    ];

    const TestComponent = gsx.Component<{}, GSXChatCompletionResult>(
      "TestComponent",
      () => (
        <GSXChatCompletion
          model="claude-3-5-sonnet-latest"
          messages={initialMessages}
          tools={[testTool]}
          max_tokens={1000}
        />
      ),
    );

    const result = await gsx.execute<GSXChatCompletionResult>(
      <AnthropicProvider apiKey="test">
        <TestComponent />
      </AnthropicProvider>,
    );

    // Verify messages array exists and contains the complete conversation
    expect(result.messages).toBeDefined();
    expect(result.messages).toHaveLength(4); // Initial 1 + Assistant tool call + Tool response + Final response

    // Check initial messages
    expect(result.messages[0]).toEqual(initialMessages[0]);

    // Check tool call message
    const toolCallMessage = result.messages[1];
    expect(toolCallMessage.role).toBe("assistant");
    expect(Array.isArray(toolCallMessage.content)).toBe(true);

    const toolCall = toolCallMessage.content.find(
      (block) => block.type === "tool_use",
    )!;

    expect(toolCall).toBeDefined();
    expect(toolCall.name).toBe("test_tool");

    // Check tool response
    expect(result.messages[2].role).toBe("user");
    let toolResponse = result.messages[2].content[0];
    expect(toolResponse.type).toBe("tool_result");

    // Check final response
    expect(result.messages[3].role).toBe("assistant");
    const finalResponse = result.messages[3].content[0];
    expect(finalResponse.type).toBe("text");
    const textBlock = finalResponse as TextBlock;
    expect(textBlock.text).toBe("Final answer after tool execution");
  });

  test("GSXChatCompletion works with tools", async () => {
    const TestComponent = gsx.Component<{}, Message>("TestComponent", () => (
      <GSXChatCompletion
        model="claude-3-5-sonnet-latest"
        messages={[{ role: "user", content: "test" }]}
        tools={[testTool]}
        max_tokens={1000}
      />
    ));

    const result = await gsx.execute<Message>(
      <AnthropicProvider apiKey="test">
        <TestComponent />
      </AnthropicProvider>,
    );

    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0].type).toBe("text");
    const textBlock = result.content[0] as TextBlock;
    expect(textBlock.text).toBe("Final answer after tool execution");
  });

  test("ToolExecutor throws error for invalid tool", async () => {
    const toolUseBlock: ToolUseBlock = {
      type: "tool_use",
      id: "call_1",
      name: "nonexistent_tool",
      input: { input: "test" },
    };

    const TestComponent = gsx.Component("TestComponent", () => (
      <ToolExecutor tools={[testTool]} toolCalls={[toolUseBlock]} />
    ));

    await expect(() =>
      gsx.execute(
        <AnthropicProvider apiKey="test">
          <TestComponent />
        </AnthropicProvider>,
      ),
    ).rejects.toThrow("Tool nonexistent_tool not found");
  });

  test("ToolExecutor throws error for invalid arguments", async () => {
    const toolUseBlock: ToolUseBlock = {
      type: "tool_use",
      id: "call_1",
      name: "test_tool",
      input: { invalid: "test" },
    };

    const TestComponent = gsx.Component("TestComponent", () => (
      <ToolExecutor tools={[testTool]} toolCalls={[toolUseBlock]} />
    ));

    await expect(() =>
      gsx.execute(
        <AnthropicProvider apiKey="test">
          <TestComponent />
        </AnthropicProvider>,
      ),
    ).rejects.toThrow("Invalid tool arguments");
  });
});
