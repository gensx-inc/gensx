/* eslint-disable @typescript-eslint/no-explicit-any */

// Import Zod extensions for improved serialization
import "./utils/zod-extensions.js";

import * as gensx from "@gensx/core";
import { Args, GSXToolProps } from "@gensx/core";
import {
  ChatCompletion as ChatCompletionOutput,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { Stream } from "openai/streaming";
import { z, ZodType } from "zod";

import { OpenAIChatCompletion } from "./openai.js";
import { streamCompletionImpl } from "./stream.js";
import { structuredOutputImpl } from "./structured-output.js";
import { GSXTool, toolsCompletionImpl } from "./tools.js";

// Types for the composition-based implementation
export type StreamingProps = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream: true;
  tools?: (GSXTool<any> | GSXToolProps<any>)[];
};

export type StructuredProps<O = unknown> = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream?: false;
  tools?: (GSXTool<any> | GSXToolProps<any>)[];
  outputSchema: z.ZodSchema<O>;
};

export type StandardProps = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream?: false;
  tools?: (GSXTool<any> | GSXToolProps<any>)[];
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
    : GSXChatCompletionResult;

// Simple type alias for the standard completion output with messages
export type GSXChatCompletionResult = ChatCompletionOutput & {
  messages: ChatCompletionMessageParam[];
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
  const result = await gensx.execute<ChatCompletionOutput>(
    <OpenAIChatCompletion {...rest} stream={false} />,
  );
  return {
    ...result,
    messages: [...props.messages, result.choices[0].message],
  } as GSXChatCompletionOutput<P>;
};

type InferSchemaType<T> = T extends { outputSchema: infer S }
  ? S extends ZodType
    ? z.infer<S>
    : never
  : T extends { stream: true }
    ? Stream<ChatCompletionChunk>
    : GSXChatCompletionResult;

interface GSXChatCompletionComponent {
  readonly __brand: "gensx-component";
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
export const GSXChatCompletion = gensx.Component<
  GSXChatCompletionProps,
  GSXChatCompletionOutput<GSXChatCompletionProps>
>(
  "GSXChatCompletion",
  gsxChatCompletionImpl,
) as unknown as GSXChatCompletionComponent;

// Base props type from OpenAI
export type ChatCompletionProps = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream?: boolean;
  tools?: GSXTool<any>[];
};

export const ChatCompletion = gensx.StreamComponent<ChatCompletionProps>(
  "ChatCompletion",
  async (props) => {
    if (props.stream) {
      const stream = await gsxChatCompletionImpl({ ...props, stream: true });

      // Transform Stream<ChatCompletionChunk> into AsyncIterableIterator<string>
      const generateTokens = (): AsyncIterableIterator<string> => {
        const iterator = stream[Symbol.asyncIterator]();
        return {
          [Symbol.asyncIterator]() {
            return this;
          },
          async next() {
            const result = await iterator.next();
            if (result.done) return { done: true, value: undefined };
            const content = result.value.choices[0]?.delta?.content;
            return content ? { done: false, value: content } : this.next();
          },
        };
      };

      return generateTokens();
    } else {
      const response = await gsxChatCompletionImpl({ ...props, stream: false });
      const content = response.choices[0]?.message?.content ?? "";

      // Use sync iterator for non-streaming case
      const generateTokens = (): IterableIterator<string> => {
        let yielded = false;
        return {
          [Symbol.iterator]() {
            return this;
          },
          next() {
            if (!yielded) {
              yielded = true;
              return { done: false, value: content };
            }
            return { done: true, value: undefined };
          },
        };
      };

      return generateTokens();
    }
  },
);
