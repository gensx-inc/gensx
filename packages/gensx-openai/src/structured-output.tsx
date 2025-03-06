/* eslint-disable @typescript-eslint/no-explicit-any */

import * as gensx from "@gensx/core";
import { GSXToolParams } from "@gensx/core";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import {
  ChatCompletion as ChatCompletionOutput,
  ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat/completions";
import { z } from "zod";

import { OpenAIChatCompletion, OpenAIContext } from "./openai.js";
import { GSXTool, toolExecutorImpl } from "./tools.js";

type StructuredOutputStrategy = "default" | "true" | "false";

// Updated type to include retry options
type StructuredOutputProps<O = unknown> = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  outputSchema: z.ZodSchema<O>;
  useToolsForStructuredOutput?: StructuredOutputStrategy;
  tools?: (GSXTool<any> | GSXToolParams<any>)[];
  retry?: {
    maxAttempts?: number;
    backoff?: "exponential" | "linear";
    onRetry?: (attempt: number, error: Error, lastResponse?: string) => void;
    shouldRetry?: (error: Error, attempt: number) => boolean;
  };
};

type StructuredOutputOutput<T> = T;

// Helper function to create an output schema tool
const createOutputSchemaTool = <T,>(
  outputSchema: z.ZodSchema<T>,
): GSXTool<any> => {
  // Create a wrapper schema that will contain the output
  const wrapperSchema = z.object({
    output: outputSchema,
  });

  return GSXTool.create({
    name: "output_schema",
    description:
      "When producing a final output, always call this tool to produce a structured output",
    schema: wrapperSchema,
    run: async (args: z.infer<typeof wrapperSchema>) => {
      // This is a passthrough function - no await needed
      return Promise.resolve(args);
    },
  });
};

// Extracted implementation function
export const structuredOutputImpl = async <T,>(
  props: StructuredOutputProps<T>,
): Promise<StructuredOutputOutput<T>> => {
  const {
    outputSchema,
    tools: toolsParams,
    retry,
    messages,
    useToolsForStructuredOutput = "default",
    ...rest
  } = props;
  const maxAttempts = retry?.maxAttempts ?? 3;
  let lastError: Error | undefined;
  let lastResponse: string | undefined;

  // Get the OpenAI client from context
  const context = gensx.useContext(OpenAIContext);
  if (!context.client) {
    throw new Error(
      "OpenAI client not found in context. Please wrap your component with OpenAIProvider.",
    );
  }

  // Check if the baseURL is for OpenAI or Azure OpenAI
  const baseURL = context.client.baseURL;
  const isOpenAIModel =
    !baseURL ||
    baseURL.includes("openai.com") ||
    baseURL.includes("openai.azure.com");

  // Determine whether to use tools based on the useToolsForStructuredOutput parameter
  const shouldUseTools =
    useToolsForStructuredOutput === "true" ||
    (useToolsForStructuredOutput === "default" && !isOpenAIModel);

  // Convert user-provided tools to GSXTool instances
  const userTools =
    toolsParams?.map((t) => (t instanceof GSXTool ? t : new GSXTool(t))) ?? [];

  // Create a tool from the output schema if we're using tools
  const outputSchemaTool = shouldUseTools
    ? createOutputSchemaTool(outputSchema)
    : undefined;

  // Combine user-provided tools with the output schema tool if needed
  const allTools = outputSchemaTool
    ? [...userTools, outputSchemaTool]
    : userTools;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Add retry context to messages if not first attempt
      const currentMessages = [...messages];
      if (attempt > 1) {
        currentMessages.push({
          role: "user",
          content: `Previous attempt failed: ${lastError?.message}. Please fix the JSON structure and try again.`,
        });
      }

      if (!shouldUseTools) {
        // Use response_format for OpenAI and Azure OpenAI or when explicitly set to false
        let completion = await gensx.execute<ChatCompletionOutput>(
          <OpenAIChatCompletion
            {...rest}
            messages={currentMessages}
            tools={
              allTools.length > 0
                ? allTools.map((t) => t.definition)
                : undefined
            }
            response_format={zodResponseFormat(outputSchema, "output_schema")}
          />,
        );

        let toolCalls = completion.choices[0].message.tool_calls;
        // If we have tool calls, execute them and make another completion
        if (toolCalls?.length && allTools.length > 0) {
          while (toolCalls?.length) {
            const toolResponses = await toolExecutorImpl({
              tools: allTools,
              toolCalls,
            });

            currentMessages.push(completion.choices[0].message);
            currentMessages.push(...toolResponses);

            completion = await gensx.execute<ChatCompletionOutput>(
              <OpenAIChatCompletion
                {...rest}
                messages={currentMessages}
                tools={allTools.map((t) => t.definition)}
                response_format={zodResponseFormat(
                  outputSchema,
                  "output_schema",
                )}
              />,
            );

            toolCalls = completion.choices[0].message.tool_calls;
          }

          // Parse and validate the final result
          const content = completion.choices[0]?.message.content;
          if (!content) {
            throw new Error(
              "No content returned from OpenAI after tool execution",
            );
          }

          lastResponse = content;
          const parsed = JSON.parse(content) as unknown;
          const validated = outputSchema.safeParse(parsed);
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
        const validated = outputSchema.safeParse(parsed);
        if (!validated.success) {
          throw new Error(
            `Invalid structured output: ${validated.error.message}`,
          );
        }
        return validated.data;
      } else {
        // Use tools approach when explicitly set to true or for non-OpenAI providers
        // Make initial completion
        let completion = await gensx.execute<ChatCompletionOutput>(
          <OpenAIChatCompletion
            {...rest}
            messages={currentMessages}
            tools={allTools.map((t) => t.definition)}
          />,
        );

        let toolCalls = completion.choices[0].message.tool_calls;
        let outputToolCall = toolCalls?.find(
          (call) => call.function.name === outputSchemaTool?.name,
        );

        // If we have tool calls, execute them and make another completion unless the output tool was called
        if (toolCalls?.length && userTools.length > 0 && !outputToolCall) {
          while (!outputToolCall && toolCalls?.length) {
            const toolResponses = await toolExecutorImpl({
              tools: userTools,
              toolCalls,
            });

            currentMessages.push(completion.choices[0].message);
            currentMessages.push(...toolResponses);

            completion = await gensx.execute<ChatCompletionOutput>(
              <OpenAIChatCompletion
                {...rest}
                messages={currentMessages}
                tools={allTools.map((t) => t.definition)}
              />,
            );

            toolCalls = completion.choices[0].message.tool_calls;
            outputToolCall = toolCalls?.find(
              (call) => call.function.name === outputSchemaTool?.name,
            );
          }

          if (!outputToolCall?.function.arguments) {
            throw new Error(
              "No structured output returned after tool execution",
            );
          }

          const structuredOutput = JSON.parse(
            outputToolCall.function.arguments,
          ) as { output: unknown };
          lastResponse = JSON.stringify(structuredOutput);
          // Extract the output property from the structured output
          const outputValue = structuredOutput.output;
          const validated = outputSchema.safeParse(outputValue);
          if (!validated.success) {
            throw new Error(
              `Invalid structured output: ${validated.error.message}`,
            );
          }
          return validated.data;
        }

        // No tool calls or direct output tool call
        if (!outputToolCall?.function.arguments) {
          throw new Error("No structured output returned");
        }

        const structuredOutput = JSON.parse(
          outputToolCall.function.arguments,
        ) as { output: unknown };
        lastResponse = JSON.stringify(structuredOutput);
        // Extract the output property from the structured output
        const outputValue = structuredOutput.output;
        const validated = outputSchema.safeParse(outputValue);
        if (!validated.success) {
          throw new Error(
            `Invalid structured output: ${validated.error.message}`,
          );
        }
        return validated.data;
      }
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

  throw new Error(
    "Failed to get valid structured output: Maximum attempts reached",
  );
};

// Updated component definition
export const StructuredOutput = gensx.Component<
  StructuredOutputProps,
  StructuredOutputOutput<unknown>
>("StructuredOutput", structuredOutputImpl);
