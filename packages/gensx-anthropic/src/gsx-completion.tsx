/* eslint-disable @typescript-eslint/no-explicit-any */

// Import Zod extensions for improved serialization
import "./utils/zod-extensions.js";

import {
  Message,
  MessageCreateParamsNonStreaming,
  RawMessageStreamEvent,
} from "@anthropic-ai/sdk/resources/index.mjs";
import { Stream } from "@anthropic-ai/sdk/streaming";
import { Args, gsx, GSXToolParams } from "gensx";
import { z, ZodType } from "zod";

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
  tools?: never; // Tools cannot be used with streaming
};

export type StructuredProps<O = unknown> = Omit<
  MessageCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream?: false;
  tools?: (GSXTool<any> | GSXToolParams<any>)[];
  outputSchema: z.ZodSchema<O>;
};

export type StandardProps = Omit<
  MessageCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream?: false;
  tools?: (GSXTool<any> | GSXToolParams<any>)[];
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
  // Validate that tools and streaming are not used together
  // This should never happen due to type constraints, but we check at runtime as well
  if (props.stream === true && "tools" in props) {
    const toolsArray = props.tools as unknown as GSXTool<any>[] | undefined;
    if (Array.isArray(toolsArray) && toolsArray.length > 0) {
      throw new Error(
        "Tools cannot be used with streaming. Please use either tools or streaming, but not both.",
      );
    }
  }

  // Handle streaming case
  if (props.stream) {
    const { ...rest } = props;
    return streamCompletionImpl({
      ...rest,
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
  const { tools: toolsParams, stream, ...rest } = props;
  const tools = toolsParams?.map((t) =>
    t instanceof GSXTool ? t : new GSXTool(t),
  );

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

type InferSchemaType<T> = T extends { outputSchema: infer S }
  ? S extends ZodType
    ? z.infer<S>
    : never
  : T extends { stream: true }
    ? Stream<RawMessageStreamEvent>
    : GSXChatCompletionResult;

interface GSXChatCompletionComponent {
  readonly __brand: "gsx-component";
  readonly __outputType: GSXChatCompletionOutput<GSXChatCompletionProps<any>>;
  readonly __rawProps: GSXChatCompletionProps<any>;
  <P extends GSXChatCompletionProps<any>>(
    props: Args<P, InferSchemaType<P>>,
  ): InferSchemaType<P>;

  run<P extends GSXChatCompletionProps<any>>(
    props: P,
  ): Promise<InferSchemaType<P>>;
}

// Update component to use implementation with explicit type casting
// Update component to use implementation
export const GSXChatCompletion = gsx.Component<
  GSXChatCompletionProps,
  GSXChatCompletionOutput<GSXChatCompletionProps>
>(
  "GSXChatCompletion",
  gsxChatCompletionImpl,
) as unknown as GSXChatCompletionComponent;

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
    // Validate that tools and streaming are not used together
    if (
      props.stream === true &&
      Array.isArray(props.tools) &&
      props.tools.length > 0
    ) {
      throw new Error(
        "Tools cannot be used with streaming. Please use either tools or streaming, but not both.",
      );
    }

    if (props.stream) {
      // Remove tools when streaming
      const { tools, ...restProps } = props;
      const stream = await gsxChatCompletionImpl({
        ...restProps,
        stream: true,
      });

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
