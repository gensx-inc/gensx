import type {
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
} from "openai/resources/index.mjs";

import { vi } from "vitest";

/**
 * Creates mock chat completion chunks for testing streaming responses
 */
export function createMockChatCompletionChunks(content: string) {
  return content.split(" ").map((word) => ({
    id: `mock-${Math.random().toString(36).slice(2)}`,
    object: "chat.completion.chunk",
    created: Date.now(),
    model: "gpt-4",
    choices: [
      {
        delta: { content: word + " " },
        finish_reason: null,
        index: 0,
      },
    ],
  }));
}

// Create a mock implementation for the chat.completions.create method
const mockCreateMethod = vi
  .fn()
  .mockImplementation((params: ChatCompletionCreateParams) => {
    // Handle streaming responses
    if (params.stream) {
      // Always use "Hello World" for streaming responses to match test expectations
      const chunks = createMockChatCompletionChunks("Hello World");

      return {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of chunks) {
            await Promise.resolve();
            yield chunk;
          }
        },
      };
    }
    // Handle structured output with JSON schema
    else if (params.response_format?.type === "json_schema") {
      // Check if there's a tool response in the conversation
      if (
        params.messages.some(
          (m: ChatCompletionMessageParam) =>
            typeof m === "object" && "role" in m && m.role === "tool",
        )
      ) {
        return {
          choices: [
            {
              message: {
                role: "assistant",
                content: JSON.stringify({
                  name: "structured output after tool execution",
                  age: 42,
                }),
              },
            },
          ],
        };
      }

      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                name: "Hello World",
                age: 42,
              }),
            },
          },
        ],
      };
    }
    // Handle tool calls
    else if (params.tools && params.tools.length > 0) {
      // Check if there's an output_schema tool in the tools array
      const hasOutputSchemaTool = params.tools.some(
        (tool) =>
          typeof tool === "object" &&
          "function" in tool &&
          tool.function.name === "output_schema",
      );

      // If there's already a tool response in the conversation
      if (
        params.messages.some(
          (m: ChatCompletionMessageParam) =>
            typeof m === "object" && "role" in m && m.role === "tool",
        )
      ) {
        return {
          choices: [
            {
              message: {
                role: "assistant",
                content: "Final answer after tool execution",
              },
            },
          ],
        };
      }

      // If we have an output_schema tool, return a tool call for it
      if (hasOutputSchemaTool) {
        return {
          choices: [
            {
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "call_output_schema",
                    type: "function",
                    function: {
                      name: "output_schema",
                      arguments: JSON.stringify({
                        output: {
                          name: "Hello World",
                          age: 42,
                        },
                      }),
                    },
                  },
                ],
              },
            },
          ],
        };
      }

      // Otherwise return a tool call for the test_tool
      return {
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_123",
                  type: "function",
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
    }
    // Default case - simple text response
    else {
      return {
        choices: [
          {
            message: { content: "Hello World" },
          },
        ],
      };
    }
  });

// Create the mock OpenAI class
const MockOpenAI = vi.fn().mockImplementation(() => {
  return {
    chat: {
      completions: {
        create: mockCreateMethod,
      },
    },
  };
});

// Export both the default export and any named exports
const originalModule = await vi.importActual("openai");

export default MockOpenAI;
export { originalModule };
