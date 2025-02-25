/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  Message,
  MessageCreateParamsNonStreaming,
  RawMessageStreamEvent,
} from "@anthropic-ai/sdk/resources/index.mjs";
import { Stream } from "@anthropic-ai/sdk/streaming";
import { gsx } from "gensx";
import { z } from "zod";

import { AnthropicChatCompletion } from "./anthropic.js";
import { streamCompletionImpl } from "./stream.js";
import { structuredOutputImpl } from "./structured-output.js";
import { GSXTool, toolsCompletionImpl } from "./tools.js";
// Types for the composition-based implementation
export type StreamingProps = Omit<
  MessageCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream: true;
  tools?: GSXTool<any>[];
};

export type StructuredProps<O = unknown> = Omit<
  MessageCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream?: false;
  tools?: GSXTool<any>[];
  outputSchema: z.ZodSchema<O>;
};

export type StandardProps = Omit<
  MessageCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream?: false;
  tools?: GSXTool<any>[];
  outputSchema?: never;
};

export type GSXChatCompletionProps<O = unknown> =
  | StreamingProps
  | StructuredProps<O>
  | StandardProps;

export type GSXChatCompletionOutput<P> = P extends StreamingProps
  ? Stream<RawMessageStreamEvent>
  : P extends StructuredProps<infer O>
    ? O
    : GSXChatCompletionResult;

// Simple type alias for the standard completion output with messages
export type GSXChatCompletionResult = Message & {
  messages: Message[];
};

// Extract GSXChatCompletion implementation
export const gsxChatCompletionImpl = async <P extends GSXChatCompletionProps>(
  props: P,
): Promise<GSXChatCompletionOutput<P>> => {
  // Handle streaming case
  if (props.stream) {
    const { tools, ...rest } = props;
    return streamCompletionImpl({
      ...rest,
      tools,
      stream: true,
    }) as GSXChatCompletionOutput<P>;
  }

  // Handle structured output case
  if ("outputSchema" in props && props.outputSchema) {
    const { tools, outputSchema, ...rest } = props;
    return structuredOutputImpl({
      ...rest,
      tools,
      outputSchema,
    }) as GSXChatCompletionOutput<P>;
  }

  // Handle standard case (with or without tools)
  const { tools, stream, ...rest } = props;
  if (tools) {
    return toolsCompletionImpl({
      ...rest,
      tools,
    }) as GSXChatCompletionOutput<P>;
  }
  const result = await gsx.execute<Message>(
    <AnthropicChatCompletion {...rest} stream={false} />,
  );
  return {
    ...result,
    messages: [
      ...props.messages,
      { role: "assistant", content: result.content },
    ],
  } as GSXChatCompletionOutput<P>;
};

// Update component to use implementation
export const GSXChatCompletion = gsx.Component<
  GSXChatCompletionProps,
  GSXChatCompletionOutput<GSXChatCompletionProps>
>("GSXChatCompletion", gsxChatCompletionImpl);

// Base props type from OpenAI
export type ChatCompletionProps = Omit<
  MessageCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream?: boolean;
  tools?: GSXTool<any>[];
};

export const ChatCompletion = gsx.StreamComponent<ChatCompletionProps>(
  "ChatCompletion",
  async (props) => {
    if (props.stream) {
      const stream = await gsxChatCompletionImpl({ ...props, stream: true });

      // Transform Stream<ChatCompletionChunk> into AsyncIterableIterator<string>
      const generateTokens = async function* () {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            yield chunk.delta.text;
          }
        }
      };

      return generateTokens();
    } else {
      const response = await gsxChatCompletionImpl({ ...props, stream: false });
      const textBlock = response.content.find((block) => block.type === "text");
      const content = textBlock?.text ?? "";

      // Use sync iterator for non-streaming case, matching ChatCompletion's behavior
      function* generateTokens() {
        yield content;
      }

      return generateTokens();
    }
  },
);
