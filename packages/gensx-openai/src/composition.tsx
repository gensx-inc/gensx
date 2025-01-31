import { gsx } from "gensx";
import {
  ChatCompletion as ChatCompletionOutput,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { Stream } from "openai/streaming";
import { z } from "zod";

import { GSXStructuredOutput, GSXTool, OpenAIContext } from "./index.js";

// Base types for raw OpenAI chat completion
type RawCompletionProps = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools" | "response_format"
>;

type RawCompletionReturn = ChatCompletionOutput;

// Raw completion component that directly calls OpenAI
export const RawCompletion = gsx.Component<
  RawCompletionProps,
  RawCompletionReturn
>("RawCompletion", async (props) => {
  const context = gsx.useContext(OpenAIContext);
  if (!context.client) {
    throw new Error(
      "OpenAI client not found in context. Please wrap your component with OpenAIProvider.",
    );
  }

  return context.client.chat.completions.create({
    ...props,
    stream: false,
  } as ChatCompletionCreateParamsNonStreaming);
});

// Stream transform component
type StreamTransformProps = RawCompletionProps & {
  stream: true;
  tools?: GSXTool<z.ZodObject<z.ZodRawShape>>[];
};

type StreamTransformReturn = Stream<ChatCompletionChunk>;

export const StreamTransform = gsx.Component<
  StreamTransformProps,
  StreamTransformReturn
>("StreamTransform", async (props) => {
  const context = gsx.useContext(OpenAIContext);
  if (!context.client) {
    throw new Error(
      "OpenAI client not found in context. Please wrap your component with OpenAIProvider.",
    );
  }

  const { stream, tools, ...rest } = props;
  const openAITools = tools?.map((tool) => tool.toOpenAITool());

  return context.client.chat.completions.create({
    ...rest,
    tools: openAITools,
    stream: true,
  } as ChatCompletionCreateParamsStreaming);
});

// Tool transform component
type ToolTransformProps = RawCompletionProps & {
  tools: GSXTool<z.ZodObject<z.ZodRawShape>>[];
};

type ToolTransformReturn = RawCompletionReturn;

export const ToolTransform = gsx.Component<
  ToolTransformProps,
  ToolTransformReturn
>("ToolTransform", async (props) => {
  const context = gsx.useContext(OpenAIContext);
  if (!context.client) {
    throw new Error(
      "OpenAI client not found in context. Please wrap your component with OpenAIProvider.",
    );
  }

  const { tools, ...rest } = props;
  const openAITools = tools.map((tool) => tool.toOpenAITool());

  return context.client.chat.completions.create({
    ...rest,
    tools: openAITools,
    stream: false,
  } as ChatCompletionCreateParamsNonStreaming);
});

// Structured output transform component
type StructuredTransformProps<T> = RawCompletionProps & {
  structuredOutput: GSXStructuredOutput<T>;
  tools?: GSXTool<z.ZodObject<z.ZodRawShape>>[];
};

type StructuredTransformReturn<T> = T;

export const StructuredTransform = gsx.Component<
  StructuredTransformProps<unknown>,
  StructuredTransformReturn<unknown>
>("StructuredTransform", async (props) => {
  const context = gsx.useContext(OpenAIContext);
  if (!context.client) {
    throw new Error(
      "OpenAI client not found in context. Please wrap your component with OpenAIProvider.",
    );
  }

  const { structuredOutput, tools, ...rest } = props;
  const openAITools = tools?.map((tool) => tool.toOpenAITool());

  const completion = await context.client.chat.completions.create({
    ...rest,
    tools: openAITools,
    response_format: structuredOutput.toResponseFormat(),
    stream: false,
  } as ChatCompletionCreateParamsNonStreaming);

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error("No content returned from OpenAI");
  }

  try {
    const parsed = JSON.parse(content) as unknown;
    const validated = structuredOutput.safeParse(parsed);
    if (!validated.success) {
      throw new Error(`Invalid structured output: ${validated.error.message}`);
    }
    return validated.data;
  } catch (e) {
    throw new Error(
      `Failed to parse structured output: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
});

// Retry transform component for structured output
type RetryTransformProps<T> = StructuredTransformProps<T> & {
  maxAttempts?: number;
};

export const RetryTransform = gsx.Component<
  RetryTransformProps<unknown>,
  StructuredTransformReturn<unknown>
>("RetryTransform", async (props) => {
  const { maxAttempts = 3, ...rest } = props;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const retryMessage: ChatCompletionMessageParam | undefined =
        attempt > 1
          ? {
              role: "system",
              content: `Previous attempt failed: ${lastError}. Please fix the JSON structure and try again.`,
            }
          : undefined;

      const messages = [...rest.messages];
      if (retryMessage) {
        messages.push(retryMessage);
      }

      return await gsx.execute(
        <StructuredTransform {...rest} messages={messages} />,
      );
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      if (attempt === maxAttempts) {
        throw new Error(
          `Failed to get valid structured output after ${maxAttempts} attempts. Last error: ${lastError}`,
        );
      }
    }
  }
});

// Types for the composition-based implementation
type StreamingProps = RawCompletionProps & {
  stream: true;
  tools?: GSXTool<z.ZodObject<z.ZodRawShape>>[];
};

type StructuredProps<T> = RawCompletionProps & {
  stream?: false;
  tools?: GSXTool<z.ZodObject<z.ZodRawShape>>[];
  structuredOutput: GSXStructuredOutput<T>;
};

type StandardProps = RawCompletionProps & {
  stream?: false;
  tools?: GSXTool<z.ZodObject<z.ZodRawShape>>[];
  structuredOutput?: never;
};

type CompositionCompletionProps<T = unknown> =
  | StreamingProps
  | StructuredProps<T>
  | StandardProps;

type CompositionCompletionReturn<P> = P extends StreamingProps
  ? Stream<ChatCompletionChunk>
  : P extends StructuredProps<infer T>
    ? T
    : ChatCompletionOutput;

// The composition-based implementation that matches ChatCompletion's functionality
export const CompositionCompletion = gsx.Component<
  CompositionCompletionProps,
  CompositionCompletionReturn<CompositionCompletionProps>
>("CompositionCompletion", (props) => {
  // Handle streaming case
  if (props.stream) {
    const { tools, ...rest } = props;
    return <StreamTransform {...rest} tools={tools} stream={true} />;
  }

  // Handle structured output case
  if ("structuredOutput" in props && props.structuredOutput) {
    const { tools, structuredOutput, ...rest } = props;
    return (
      <RetryTransform
        {...rest}
        tools={tools}
        structuredOutput={structuredOutput}
      />
    );
  }

  // Handle standard case (with or without tools)
  const { tools, ...rest } = props;
  if (tools) {
    return <ToolTransform {...rest} tools={tools} />;
  }
  return <RawCompletion {...rest} />;
});
