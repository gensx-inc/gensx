import type {
  ContentBlock,
  Message,
  RawMessageStreamEvent,
  TextBlock,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages";

export interface MockMessageOptions {
  content: ContentBlock[];
}

export function createMockTextContent(text: string): ContentBlock[] {
  return [
    {
      type: "text",
      text,
      citations: [],
    },
  ];
}

export function createMockMessage(options: MockMessageOptions): Message {
  const { content } = options;

  return {
    id: `msg_${Math.random().toString(36).slice(2)}`,
    type: "message",
    role: "assistant",
    content: content,
    model: "claude-3-5-sonnet-latest",
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 10,
      output_tokens: 20,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  };
}

// This is a simplified mock for testing purposes
export function createMockStreamEvents(
  content: string,
): AsyncIterable<RawMessageStreamEvent> {
  const words = content.split(" ");

  // Create a mock async iterable that yields text delta events
  return {
    [Symbol.asyncIterator]: async function* () {
      // Add a small delay to simulate network latency
      await Promise.resolve();

      // Yield a message_start event
      yield {
        type: "message_start",
        message: {
          id: `msg_${Math.random().toString(36).slice(2)}`,
          type: "message",
          role: "assistant",
          content: [],
          model: "claude-3-5-sonnet-latest",
          stop_reason: null,
          stop_sequence: null,
          usage: {
            input_tokens: 10,
            output_tokens: 0,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
          },
        },
      } as RawMessageStreamEvent;

      // Yield a content_block_start event
      yield {
        type: "content_block_start",
        content_block: {
          type: "text",
          text: "",
          citations: [],
        } as TextBlock,
        index: 0,
      } as RawMessageStreamEvent;

      // Yield text delta events for each word
      for (const word of words) {
        yield {
          type: "content_block_delta",
          delta: {
            type: "text_delta",
            text: word + " ",
          },
          index: 0,
        } as RawMessageStreamEvent;
      }

      // Yield a content_block_stop event
      yield {
        type: "content_block_stop",
        index: 0,
      } as RawMessageStreamEvent;

      // Yield a message_stop event
      yield {
        type: "message_stop",
      } as RawMessageStreamEvent;
    },
  };
}

export function createMockToolUseBlock(
  toolName: string,
  toolInput: Record<string, unknown>,
): ToolUseBlock {
  return {
    type: "tool_use",
    id: `tu_${Math.random().toString(36).slice(2)}`,
    name: toolName,
    input: toolInput,
  };
}

export function createMockMessageWithToolUse(
  toolName: string,
  toolInput: Record<string, unknown>,
): Message {
  const toolUseBlock = createMockToolUseBlock(toolName, toolInput);

  return {
    id: `msg_${Math.random().toString(36).slice(2)}`,
    type: "message",
    role: "assistant",
    content: [toolUseBlock],
    model: "claude-3-5-sonnet-latest",
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: {
      input_tokens: 10,
      output_tokens: 20,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  };
}
