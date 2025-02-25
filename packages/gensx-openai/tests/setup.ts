import type {
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
} from "openai/resources/index.mjs";

import { afterEach, beforeEach, vi } from "vitest";

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

afterEach(() => {
  vi.clearAllMocks();
});

beforeEach(() => {
  vi.resetModules();
});

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

// Mock OpenAI client
vi.mock("openai", async (importOriginal) => {
  const originalOpenAI: Awaited<typeof import("openai")> =
    await importOriginal();

  // Create a mock class constructor
  const MockOpenAI = vi.fn();

  // Set up the prototype with the mock implementation
  MockOpenAI.prototype = {
    chat: {
      completions: {
        create: mockCreateMethod,
      },
    },
  };

  // Return both the default export and the create method directly
  // This ensures that both the class and any direct imports of the create method are mocked
  return {
    ...originalOpenAI,
    default: MockOpenAI,
  };
});
