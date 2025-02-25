/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  Message,
  MessageCreateParamsNonStreaming,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/index.mjs";
import { gsx } from "gensx";
//import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";

import { AnthropicChatCompletion } from "./anthropic.js";
import { GSXTool, toolExecutorImpl } from "./tools.js";

// Updated type to include retry options
type StructuredOutputProps<O = unknown> = Omit<
  MessageCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  outputSchema: z.ZodSchema<O>;
  tools?: GSXTool<any>[];
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
  const { outputSchema, tools, retry, messages, ...rest } = props;
  const maxAttempts = retry?.maxAttempts ?? 3;
  let lastError: Error | undefined;
  let lastResponse: string | undefined;

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
      let completion = await gsx.execute<Message>(
        <AnthropicChatCompletion
          {...rest}
          messages={currentMessages}
          tools={tools?.map((t) => t.definition)}
          //response_format={zodResponseFormat(outputSchema, "output_schema")}
        />,
      );

      // If we have tool calls, execute them and make another completion
      if (completion.stop_reason !== "tool_use" && tools) {
        while (completion.stop_reason !== "tool_use") {
          let toolCalls = completion.content.filter<ToolUseBlock>(
            (content) => content.type === "tool_use",
          );
          const toolResponses = await toolExecutorImpl({
            tools,
            toolCalls,
          });

          currentMessages.push(completion);
          currentMessages.push(...toolResponses);

          completion = await gsx.execute<Message>(
            <AnthropicChatCompletion
              {...rest}
              messages={currentMessages}
              tools={tools.map((t) => t.definition)}
              //response_format={zodResponseFormat(outputSchema, "output_schema")}
            />,
          );
        }

        // Parse and validate the final result
        const textBlock = completion.content.find(
          (block) => block.type === "text",
        );
        const content = textBlock?.text;
        if (!content) {
          throw new Error(
            "No content returned from Anthropic after tool execution",
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
      const textBlock = completion.content.find(
        (block) => block.type === "text",
      );
      const content = textBlock?.text;
      if (!content) {
        throw new Error("No content returned from Anthropic");
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
export const StructuredOutput = gsx.Component<
  StructuredOutputProps,
  StructuredOutputOutput<unknown>
>("StructuredOutput", structuredOutputImpl);
