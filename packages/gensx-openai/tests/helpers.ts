import type {
  ChatCompletionChunk,
  ChatCompletionCreateParams,
} from "openai/resources/index.mjs";

import { vi } from "vitest";

export interface MockChatCompletionOptions {
  content: string;
}

export function createMockChatCompletionChunks(
  content: string,
): ChatCompletionChunk[] {
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

/**
 * Creates a unified mock for OpenAI that handles all test scenarios
 */
export const createUnifiedOpenAIMock = async (
  importOriginal: () => Promise<Record<string, unknown>>,
) => {
  const originalOpenAI = await importOriginal();

  const mockedOpenAIClass = vi.fn();

  mockedOpenAIClass.prototype = {
    chat: {
      completions: {
        create: vi
          .fn()
          .mockImplementation((params: ChatCompletionCreateParams) => {
            // Handle streaming responses
            if (params.stream) {
              // Get the last message content or default to "Hello World"
              const lastMessage = params.messages[params.messages.length - 1];
              // Handle different content types safely
              let contentText = "Hello World";
              if (typeof lastMessage.content === "string") {
                contentText = lastMessage.content;
              }

              const chunks = createMockChatCompletionChunks(contentText);

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
              if (params.messages.some((m) => m.role === "tool")) {
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
              // If there's already a tool response in the conversation, return a final answer
              if (params.messages.some((m) => m.role === "tool")) {
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

              // Otherwise return a tool call
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
                            name: "get_current_weather",
                            arguments: JSON.stringify({
                              location: "San Francisco",
                            }),
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
          }),
      },
    },
  };

  return {
    ...originalOpenAI,

    default: mockedOpenAIClass,
  };
};
