import type { ChatCompletionChunk } from "openai/resources/index.mjs";

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
