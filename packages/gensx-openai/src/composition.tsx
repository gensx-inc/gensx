/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { gsx } from "gensx";
import {
  ChatCompletion as ChatCompletionOutput,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { Stream } from "openai/streaming";

import { OpenAIContext } from "./index.js";
import { GSXStructuredOutput, GSXTool } from "./newCompletion.js";

// Base types for raw OpenAI chat completion
type RawCompletionProps =
  | (Omit<ChatCompletionCreateParamsNonStreaming, "tools"> & {
      tools?: ChatCompletionTool[];
    })
  | (Omit<ChatCompletionCreateParamsStreaming, "tools"> & {
      tools?: ChatCompletionTool[];
    });

type RawCompletionReturn = ChatCompletionOutput | Stream<ChatCompletionChunk>;

// Stream transform component
type StreamTransformProps = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream: true;
  tools?: GSXTool<any>[];
};

type StreamTransformReturn = Stream<ChatCompletionChunk>;

// Tool execution component
interface ToolExecutorProps {
  tools: GSXTool<any>[];
  toolCalls: NonNullable<
    ChatCompletionOutput["choices"][0]["message"]["tool_calls"]
  >;
  messages: ChatCompletionMessageParam[];
  model: string;
}

type ToolExecutorReturn = ChatCompletionMessageParam[];

// Tool transform component
type ToolTransformProps = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  tools: GSXTool<any>[];
};

type ToolTransformReturn = RawCompletionReturn;

// Structured output transform component
type StructuredTransformProps<O = unknown> = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  structuredOutput: GSXStructuredOutput<O>;
  tools?: GSXTool<any>[];
};

type StructuredTransformReturn<T> = T;

// Add RetryTransformProps type
type RetryTransformProps<O = unknown> = StructuredTransformProps<O> & {
  maxAttempts?: number;
};

// Types for the composition-based implementation
type StreamingProps = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream: true;
  tools?: GSXTool<any>[];
};

type StructuredProps<O = unknown> = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream?: false;
  tools?: GSXTool<any>[];
  structuredOutput: GSXStructuredOutput<O>;
};

type StandardProps = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  stream?: false;
  tools?: GSXTool<any>[];
  structuredOutput?: never;
};

type CompositionCompletionProps<O = unknown> =
  | StreamingProps
  | StructuredProps<O>
  | StandardProps;

type CompositionCompletionReturn<P> = P extends StreamingProps
  ? Stream<ChatCompletionChunk>
  : P extends StructuredProps<infer O>
    ? O
    : ChatCompletionOutput;

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

  return context.client.chat.completions.create(props);
});

// Stream transform component
export const StreamTransform = gsx.Component<
  StreamTransformProps,
  StreamTransformReturn
>("StreamTransform", async (props) => {
  const { stream, tools, ...rest } = props;

  // If we have tools, first make a synchronous call to get tool calls
  if (tools?.length) {
    // Make initial completion to get tool calls
    const completion = await gsx.execute<ChatCompletionOutput>(
      <RawCompletion {...rest} tools={tools} stream={false} />,
    );

    const toolCalls = completion.choices[0]?.message?.tool_calls;
    // If no tool calls, proceed with streaming the original response
    if (!toolCalls?.length) {
      return gsx.execute<Stream<ChatCompletionChunk>>(
        <RawCompletion {...rest} stream={true} />,
      );
    }

    // Execute tools
    const toolResponses = await gsx.execute<ChatCompletionMessageParam[]>(
      <ToolExecutor
        tools={tools}
        toolCalls={toolCalls}
        messages={[...rest.messages, completion.choices[0].message]}
        model={rest.model}
      />,
    );

    // Make final streaming call with all messages
    return gsx.execute<Stream<ChatCompletionChunk>>(
      <RawCompletion
        {...rest}
        messages={[
          ...rest.messages,
          completion.choices[0].message,
          ...toolResponses,
        ]}
        stream={true}
      />,
    );
  }

  // No tools, just stream normally
  return gsx.execute<Stream<ChatCompletionChunk>>(
    <RawCompletion {...rest} tools={tools} stream={true} />,
  );
});

// Tool execution component
export const ToolExecutor = gsx.Component<
  ToolExecutorProps,
  ToolExecutorReturn
>("ToolExecutor", async (props) => {
  const { tools, toolCalls } = props;
  const context = gsx.useContext(OpenAIContext);
  if (!context.client) {
    throw new Error(
      "OpenAI client not found in context. Please wrap your component with OpenAIProvider.",
    );
  }

  // Execute each tool call
  return await Promise.all(
    toolCalls.map(async (toolCall) => {
      const tool = tools.find((t) => t.name === toolCall.function.name);
      if (!tool) {
        throw new Error(`Tool ${toolCall.function.name} not found`);
      }

      try {
        const args = JSON.parse(toolCall.function.arguments) as Record<
          string,
          unknown
        >;
        const validated = tool.parameters.safeParse(args);
        if (!validated.success) {
          throw new Error(`Invalid tool arguments: ${validated.error.message}`);
        }
        const result = await tool.execute(validated.data);
        return {
          tool_call_id: toolCall.id,
          role: "tool" as const,
          content: typeof result === "string" ? result : JSON.stringify(result),
        };
      } catch (e) {
        throw new Error(
          `Failed to execute tool ${toolCall.function.name}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }),
  );
});

// Tool transform component
export const ToolTransform = gsx.Component<
  ToolTransformProps,
  ToolTransformReturn
>("ToolTransform", async (props) => {
  const { tools, ...rest } = props;

  // Make initial completion to get tool calls
  const completion = await gsx.execute<ChatCompletionOutput>(
    <RawCompletion {...rest} tools={tools} />,
  );

  const toolCalls = completion.choices[0].message.tool_calls;
  // If no tool calls, return the completion
  if (!toolCalls?.length) {
    return completion;
  }

  // Execute tools and get final completion
  return gsx.execute<ChatCompletionOutput>(
    <ToolExecutor
      tools={tools}
      toolCalls={toolCalls}
      messages={[...rest.messages, completion.choices[0].message]}
      model={rest.model}
    />,
  );
});

// Structured output transform component
export const StructuredTransform = gsx.Component<
  StructuredTransformProps,
  StructuredTransformReturn<unknown>
>("StructuredTransform", async (props) => {
  const { structuredOutput, tools, ...rest } = props;

  // Make initial completion
  const completion = await gsx.execute<ChatCompletionOutput>(
    <RawCompletion
      {...rest}
      tools={tools}
      response_format={structuredOutput.toResponseFormat()}
    />,
  );

  const toolCalls = completion.choices[0].message.tool_calls;
  // If we have tool calls, execute them and make another completion
  if (toolCalls?.length && tools) {
    const toolResult = await gsx.execute<ChatCompletionOutput>(
      <ToolExecutor
        tools={tools}
        toolCalls={toolCalls}
        messages={[...rest.messages, completion.choices[0].message]}
        model={rest.model}
      />,
    );

    // Parse and validate the final result
    const content = toolResult.choices[0]?.message.content;
    if (!content) {
      throw new Error("No content returned from OpenAI after tool execution");
    }

    try {
      const parsed = JSON.parse(content) as unknown;
      const validated = structuredOutput.safeParse(parsed);
      if (!validated.success) {
        throw new Error(
          `Invalid structured output: ${validated.error.message}`,
        );
      }
      return validated.data;
    } catch (e) {
      throw new Error(
        `Failed to parse structured output after tool execution: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // No tool calls, parse and validate the direct result
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
export const RetryTransform = gsx.Component<
  RetryTransformProps,
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
