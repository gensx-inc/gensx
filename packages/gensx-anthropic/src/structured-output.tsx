/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  Message,
  MessageCreateParamsNonStreaming,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/index.mjs";
import * as gensx from "@gensx/core";
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
  tools?: (GSXTool<any> | gensx.GSXToolProps<any>)[];
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
    tools: toolsParams = [],
    retry,
    messages,
    ...rest
  } = props;
  const tools = toolsParams.map((t) =>
    t instanceof GSXTool ? t : new GSXTool(t),
  );

  const maxAttempts = retry?.maxAttempts ?? 3;
  let lastError: Error | undefined;
  let lastResponse: string | undefined;

  // Create a tool from the output schema
  const outputSchemaTool = createOutputSchemaTool(outputSchema);

  // Combine user-provided tools with the output schema tool
  const allTools = [...tools, outputSchemaTool];

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
      let completion = await gensx.execute<Message>(
        <AnthropicChatCompletion
          {...rest}
          messages={currentMessages}
          tools={allTools.map((t) => t.definition)}
          tool_choice={{ type: "any" }}
        />,
      );

      let toolCalls = completion.content.filter<ToolUseBlock>(
        (content) => content.type === "tool_use",
      );
      let outputToolCall = toolCalls.find(
        (call) => call.name === outputSchemaTool.name,
      );

      // If we have tool calls, execute them and make another completion unless the output tool was called
      if (toolCalls.length > 0 && tools.length > 0 && !outputToolCall) {
        while (!outputToolCall && toolCalls.length > 0) {
          const toolResponses = await toolExecutorImpl({
            tools,
            toolCalls,
          });

          currentMessages.push({
            role: "assistant",
            content: completion.content,
          });
          currentMessages.push(toolResponses);

          completion = await gensx.execute<Message>(
            <AnthropicChatCompletion
              {...rest}
              messages={currentMessages}
              tools={allTools.map((t) => t.definition)}
              tool_choice={{ type: "any" }}
            />,
          );

          toolCalls = completion.content.filter<ToolUseBlock>(
            (content) => content.type === "tool_use",
          );

          outputToolCall = toolCalls.find(
            (call) => call.name === outputSchemaTool.name,
          );
        }

        if (!outputToolCall?.input) {
          throw new Error(
            "No structured output returned from Anthropic after tool execution",
          );
        }

        const structuredOutput = outputToolCall.input as { output: unknown };
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

      // No tool calls, parse and validate the direct result
      if (!outputToolCall?.input) {
        throw new Error("No structured output returned from Anthropic");
      }

      const structuredOutput = outputToolCall.input as { output: unknown };
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
