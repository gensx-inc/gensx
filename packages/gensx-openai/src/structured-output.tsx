/* eslint-disable @typescript-eslint/no-explicit-any */

import * as gensx from "@gensx/core";
import { GSXToolParams } from "@gensx/core";
import { zodResponseFormat } from "openai/helpers/zod.mjs";
import {
  ChatCompletion as ChatCompletionOutput,
  ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat/completions";
import { z } from "zod";

import { OpenAIChatCompletion } from "./openai.js";
import { GSXTool, toolExecutorImpl } from "./tools.js";

// Updated type to include retry options
type StructuredOutputProps<O = unknown> = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  outputSchema: z.ZodSchema<O>;
  tools?: (GSXTool<any> | GSXToolParams<any>)[];
  retry?: {
    maxAttempts?: number;
    backoff?: "exponential" | "linear";
    onRetry?: (attempt: number, error: Error, lastResponse?: string) => void;
    shouldRetry?: (error: Error, attempt: number) => boolean;
  };
};

type StructuredOutputOutput<T> = T;

// Extracted implementation function
export const structuredOutputImpl = async <T,>(
  props: StructuredOutputProps<T>,
): Promise<StructuredOutputOutput<T>> => {
  const { outputSchema, tools: toolsParams, retry, messages, ...rest } = props;
  const maxAttempts = retry?.maxAttempts ?? 3;
  let lastError: Error | undefined;
  let lastResponse: string | undefined;

  const tools = toolsParams?.map((t) =>
    t instanceof GSXTool ? t : new GSXTool(t),
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Add retry context to messages if not first attempt
      const currentMessages = messages;
      if (attempt > 1) {
        messages.push({
          role: "user",
          content: `Previous attempt failed: ${lastError?.message}. Please fix the JSON structure and try again.`,
        });
      }

      // Make initial completion
      let completion = await gensx.execute<ChatCompletionOutput>(
        <OpenAIChatCompletion
          {...rest}
          messages={currentMessages}
          tools={tools?.map((t) => t.definition)}
          response_format={zodResponseFormat(outputSchema, "output_schema")}
        />,
      );

      let toolCalls = completion.choices[0].message.tool_calls;
      // If we have tool calls, execute them and make another completion
      if (toolCalls?.length && tools) {
        while (toolCalls?.length) {
          const toolResponses = await toolExecutorImpl({
            tools,
            toolCalls,
          });

          currentMessages.push(completion.choices[0].message);
          currentMessages.push(...toolResponses);

          completion = await gensx.execute<ChatCompletionOutput>(
            <OpenAIChatCompletion
              {...rest}
              messages={currentMessages}
              tools={tools.map((t) => t.definition)}
              response_format={zodResponseFormat(outputSchema, "output_schema")}
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
