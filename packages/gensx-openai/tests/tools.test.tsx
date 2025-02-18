import { gsx } from "gensx";
import {
  ChatCompletionCreateParams,
  ChatCompletionToolMessageParam,
} from "openai/resources/index.mjs";
import { expect, suite, test, vi } from "vitest";
import { z } from "zod";

import { GSXTool, OpenAIProvider } from "@/index.js";
import { ToolExecutor } from "@/tools";

// Mock OpenAI client
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
          .mockImplementation(async (params: ChatCompletionCreateParams) => {
            await Promise.resolve(); // Add await to satisfy linter
            // Handle tool calls
            if (params.tools?.length) {
              return {
                choices: [
                  {
                    message: {
                      tool_calls: [
                        {
                          id: "call_1",
                          type: "function" as const,
                          function: {
                            name: "test_tool",
                            arguments: JSON.stringify({ input: "test" }),
                          },
                        },
                      ],
                    },
                  },
                ],
              };
            } else {
              return {
                choices: [
                  {
                    message: { content: "Hello World" },
                  },
                ],
              };
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

suite("Tools", () => {
  // Create a test tool
  const testToolSchema = z.object({
    input: z.string(),
  });

  const testTool = new GSXTool(
    "test_tool",
    "A test tool",
    testToolSchema,
    async (args) => {
      await Promise.resolve();
      return `Processed: ${args.input}`;
    },
  );

  test("GSXTool creation and definition", () => {
    expect(testTool.name).toBe("test_tool");
    expect(testTool.description).toBe("A test tool");
    expect(testTool.type).toBe("function");
    expect(testTool.definition.type).toBe("function");
    expect(testTool.definition.function.name).toBe("test_tool");
  });

  test("GSXTool execution", async () => {
    const result = await testTool.execute({ input: "test" });
    expect(result).toBe("Processed: test");
  });

  test("ToolExecutor executes tools correctly", async () => {
    const TestComponent = gsx.Component<{}, ChatCompletionToolMessageParam[]>(
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
          messages={[{ role: "user", content: "test" }]}
          model="gpt-4"
        />
      ),
    );

    const result = await gsx.execute<ChatCompletionToolMessageParam[]>(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result).toHaveLength(1);
    expect(result[0].tool_call_id).toBe("call_1");
    expect(result[0].role).toBe("tool");
    expect(result[0].content).toBe("Processed: test");
  });

  // test("ToolsCompletion handles tool-based conversation", async () => {
  //   const TestComponent = gsx.Component<{}, ChatCompletionOutput>(
  //     "TestComponent",
  //     () => (
  //       <ToolsCompletion
  //         model="gpt-4"
  //         messages={[{ role: "user", content: "test" }]}
  //         tools={[testTool]}
  //       />
  //     ),
  //   );

  //   const result = await gsx.execute<ChatCompletionOutput>(
  //     <OpenAIProvider apiKey="test">
  //       <TestComponent />
  //     </OpenAIProvider>,
  //   );

  //   expect(result.choices[0].message).toBeDefined();
  // });

  // test("GSXChatCompletion works with tools", async () => {
  //   const TestComponent = gsx.Component<{}, ChatCompletionOutput>(
  //     "TestComponent",
  //     () => (
  //       <GSXChatCompletion
  //         model="gpt-4"
  //         messages={[{ role: "user", content: "test" }]}
  //         tools={[testTool]}
  //       />
  //     ),
  //   );

  //   const result = await gsx.execute<ChatCompletionOutput>(
  //     <OpenAIProvider apiKey="test">
  //       <TestComponent />
  //     </OpenAIProvider>,
  //   );

  //   expect(result.choices[0].message).toBeDefined();
  // });

  test("ToolExecutor throws error for invalid tool", async () => {
    const TestComponent = gsx.Component("TestComponent", () => (
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
        messages={[{ role: "user", content: "test" }]}
        model="gpt-4"
      />
    ));

    await expect(() =>
      gsx.execute(
        <OpenAIProvider apiKey="test">
          <TestComponent />
        </OpenAIProvider>,
      ),
    ).rejects.toThrow("Tool nonexistent_tool not found");
  });

  test("ToolExecutor throws error for invalid arguments", async () => {
    const TestComponent = gsx.Component("TestComponent", () => (
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
        messages={[{ role: "user", content: "test" }]}
        model="gpt-4"
      />
    ));

    await expect(() =>
      gsx.execute(
        <OpenAIProvider apiKey="test">
          <TestComponent />
        </OpenAIProvider>,
      ),
    ).rejects.toThrow("Invalid tool arguments");
  });
});
