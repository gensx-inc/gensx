/* eslint-disable @typescript-eslint/no-explicit-any */

import { gsx } from "gensx";
import {
  ChatCompletion as ChatCompletionOutput,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat/completions";
import { Stream } from "openai/streaming";
import { z } from "zod";

import { OpenAIChatCompletion } from "./openai.js";
import { StreamCompletion } from "./stream.js";
import { structuredOutputImpl } from "./structured-output.js";
import { GSXTool, toolsCompletionImpl } from "./tools.js";
// Types for the composition-based implementation
export type StreamingProps = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream: true;
  tools?: GSXTool<any>[];
};

export type StructuredProps<O = unknown> = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream?: false;
  tools?: GSXTool<any>[];
  outputSchema: z.ZodSchema<O>;
};

export type StandardProps = Omit<
  ChatCompletionCreateParamsNonStreaming,
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
  ? Stream<ChatCompletionChunk>
  : P extends StructuredProps<infer O>
    ? O
    : ChatCompletionOutput;

// Extract GSXChatCompletion implementation
export const gsxChatCompletionImpl = <P extends GSXChatCompletionProps>(
  props: P,
): GSXChatCompletionOutput<P> => {
  // Handle streaming case
  if (props.stream) {
    const { tools, ...rest } = props;
    return (
      <StreamCompletion {...rest} tools={tools} stream={true} />
    ) as GSXChatCompletionOutput<P>;
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
  return (
    <OpenAIChatCompletion {...rest} stream={false} />
  ) as GSXChatCompletionOutput<P>;
};

// Update component to use implementation
export const GSXChatCompletion = gsx.Component<
  GSXChatCompletionProps,
  GSXChatCompletionOutput<GSXChatCompletionProps>
>("GSXChatCompletion", gsxChatCompletionImpl);

// Base props type from OpenAI
export type ChatCompletionProps = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream?: boolean;
  tools?: GSXTool<any>[];
};

export const ChatCompletion = gsx.StreamComponent<ChatCompletionProps>(
  "ChatCompletion",
  async (props) => {
    if (props.stream) {
      const stream = await gsx.execute<Stream<ChatCompletionChunk>>(
        gsxChatCompletionImpl({ ...props, stream: true }),
      );

      // Transform Stream<ChatCompletionChunk> into AsyncIterableIterator<string>
      const generateTokens = async function* () {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            yield content;
          }
        }
      };

      return generateTokens();
    } else {
      const response = await gsx.execute<ChatCompletionOutput>(
        gsxChatCompletionImpl({ ...props, stream: false }),
      );
      const content = response.choices[0]?.message?.content ?? "";

      // Use sync iterator for non-streaming case, matching ChatCompletion's behavior
      function* generateTokens() {
        yield content;
      }

      return generateTokens();
    }
  },
);
