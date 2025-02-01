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

// Updated type to include retry options
type StructuredOutputProps<O = unknown> = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  structuredOutput: GSXStructuredOutput<O>;
  tools?: GSXTool<any>[];
  retry?: {
    maxAttempts?: number;
    backoff?: "exponential" | "linear";
    onRetry?: (attempt: number, error: Error, lastResponse?: string) => void;
    shouldRetry?: (error: Error, attempt: number) => boolean;
  };
};

type StructuredOutputReturn<T> = T;

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

  // Execute tools
  const toolResponses = await gsx.execute<ChatCompletionMessageParam[]>(
    <ToolExecutor
      tools={tools}
      toolCalls={toolCalls}
      messages={[...rest.messages, completion.choices[0].message]}
      model={rest.model}
    />,
  );

  // Make final completion with tool results
  return gsx.execute<ChatCompletionOutput>(
    <RawCompletion
      {...rest}
      messages={[
        ...rest.messages,
        completion.choices[0].message,
        ...toolResponses,
      ]}
    />,
  );
});

// Combined structured output component
export const StructuredOutput = gsx.Component<
  StructuredOutputProps,
  StructuredOutputReturn<unknown>
>("StructuredOutput", async (props) => {
  const { structuredOutput, tools, retry, ...rest } = props;
  const maxAttempts = retry?.maxAttempts ?? 3;
  let lastError: Error | undefined;
  let lastResponse: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Add retry context to messages if not first attempt
      const messages = [...rest.messages];
      if (attempt > 1) {
        messages.push({
          role: "system",
          content: `Previous attempt failed: ${lastError?.message}. Please fix the JSON structure and try again.`,
        });
      }

      // Make initial completion
      const completion = await gsx.execute<ChatCompletionOutput>(
        <RawCompletion
          {...rest}
          messages={messages}
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
            messages={[...messages, completion.choices[0].message]}
            model={rest.model}
          />,
        );

        // Parse and validate the final result
        const content = toolResult.choices[0]?.message.content;
        if (!content) {
          throw new Error(
            "No content returned from OpenAI after tool execution",
          );
        }

        lastResponse = content;
        const parsed = JSON.parse(content) as unknown;
        const validated = structuredOutput.safeParse(parsed);
        if (!validated.success) {
          throw new Error(
            `Invalid structured output: ${validated.error.message}`,
          );
        }
        return validated.data;
      }

      // No tool calls, parse and validate the direct result
      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      lastResponse = content;
      const parsed = JSON.parse(content) as unknown;
      const validated = structuredOutput.safeParse(parsed);
      if (!validated.success) {
        throw new Error(
          `Invalid structured output: ${validated.error.message}`,
        );
      }
      return validated.data;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));

      // Call onRetry callback if provided
      retry?.onRetry?.(attempt, lastError, lastResponse);

      // Check if we should retry
      const shouldRetry = retry?.shouldRetry?.(lastError, attempt) ?? true;
      if (!shouldRetry || attempt === maxAttempts) {
        throw new Error(
          `Failed to get valid structured output after ${attempt} attempts. Last error: ${lastError.message}`,
        );
      }

      // Apply backoff if specified
      if (retry?.backoff) {
        const delay =
          retry.backoff === "exponential"
            ? Math.pow(2, attempt - 1) * 1000
            : attempt * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
});

// Update CompositionCompletion to use the renamed component
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
      <StructuredOutput
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
