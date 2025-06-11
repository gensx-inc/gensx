/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import type { ComponentOpts, WrapOptions } from "@gensx/core";

import { Component, wrap } from "@gensx/core";
import { OpenAI as OriginalOpenAI } from "openai";
import { RunnableToolFunctionWithParse } from "openai/lib/RunnableFunction.mjs";

// Aggregates streaming ChatCompletionChunk objects into a single ChatCompletion object
function aggregateChatCompletionChunks(chunks: unknown[]): unknown {
  if (chunks.length === 0) {
    return null;
  }

  // If we only have one chunk and it's a complete ChatCompletion (not streaming), return it as-is
  if (chunks.length === 1) {
    const singleChunk = chunks[0] as any;
    // Check if it's a complete ChatCompletion response (has choices array with content, not deltas)
    if (singleChunk?.choices?.[0]?.message?.content !== undefined) {
      return singleChunk;
    }
  }

  // Multiple chunks or streaming chunks - aggregate them
  const firstChunk = chunks[0] as any;
  if (!firstChunk || typeof firstChunk !== "object") {
    return chunks;
  }

  // Initialize the aggregated response structure
  const aggregated: any = {
    id: firstChunk.id ?? "chatcmpl-" + String(Date.now()),
    object: "chat.completion",
    created: firstChunk.created ?? Math.floor(Date.now() / 1000),
    model: firstChunk.model ?? "gpt-3.5-turbo",
    choices: [],
  };

  // Process each chunk
  for (const chunk of chunks) {
    const typedChunk = chunk as any;

    if (!typedChunk?.choices) continue;

    for (const choice of typedChunk.choices) {
      const index = parseInt(String(choice.index), 10);

      aggregated.choices[index] ??= {
        index,
        message: {
          role: "assistant",
          content: "",
        },
        finish_reason: null,
      };

      // Accumulate content from delta
      if (choice.delta?.content) {
        const existingContent = String(
          aggregated.choices[index].message.content,
        );
        const newContent = String(choice.delta.content);
        aggregated.choices[index].message.content =
          existingContent + newContent;
      }

      // Set role if present
      if (choice.delta?.role) {
        aggregated.choices[index].message.role = choice.delta.role;
      }

      // Set finish reason from the last chunk that has it
      if (choice.finish_reason) {
        aggregated.choices[index].finish_reason = choice.finish_reason;
      }

      // Handle tool calls if present
      if (choice.delta?.tool_calls) {
        aggregated.choices[index].message.tool_calls ??= [];

        for (const toolCallDelta of choice.delta.tool_calls) {
          const toolCallIndex = toolCallDelta.index;

          if (!aggregated.choices[index].message.tool_calls[toolCallIndex]) {
            aggregated.choices[index].message.tool_calls[toolCallIndex] = {
              id: toolCallDelta.id ?? "",
              type: toolCallDelta.type ?? "function",
              function: {
                name: toolCallDelta.function?.name ?? "",
                arguments: toolCallDelta.function?.arguments ?? "",
              },
            };
          } else {
            // Accumulate function arguments
            if (toolCallDelta.function?.arguments) {
              const existingArgs = String(
                aggregated.choices[index].message.tool_calls[toolCallIndex]
                  .function.arguments,
              );
              const newArgs = String(toolCallDelta.function.arguments);
              aggregated.choices[index].message.tool_calls[
                toolCallIndex
              ].function.arguments = existingArgs + newArgs;
            }
          }
        }
      }
    }

    // Update usage from the last chunk that has it
    if (typedChunk.usage) {
      aggregated.usage = typedChunk.usage;
    }
  }

  // Convert choices object to array
  aggregated.choices = Object.values(
    aggregated.choices as Record<string, unknown>,
  );

  return aggregated;
}

/**
 * A pre-wrapped version of the OpenAI SDK that makes all methods available as GenSX components.
 *
 * @example
 * ```ts
 * import { openai } from "@gensx/openai";
 *
 * // Use chat completions
 * const completion = await openai.chat.completions.create({
 *   model: "gpt-4.1-mini",
 *   messages: [{ role: "user", content: "Hello!" }]
 * });
 *
 * // Use embeddings
 * const embedding = await openai.embeddings.create({
 *   model: "text-embedding-3-small",
 *   input: "Hello world!"
 * });
 * ```
 */

export class OpenAI extends OriginalOpenAI {
  constructor(config?: ConstructorParameters<typeof OriginalOpenAI>[0]) {
    super(config);
    return wrapOpenAI(this);
  }
}

export const wrapOpenAI = (
  openAiInstance: OriginalOpenAI,
  opts: WrapOptions = {},
) => {
  let wrapped: OriginalOpenAI;
  // Create a wrapped instance
  wrapped = wrap(openAiInstance, {
    ...opts,
    // Add metadata to component options
    getComponentOpts: (
      path: string[],
      args: unknown,
    ): Partial<ComponentOpts> => {
      // Always set aggregation for chat completions since we can't detect stream parameter at wrap time
      if (path.includes("completions")) {
        return {
          aggregator: aggregateChatCompletionChunks,
          __streamingResultKey: "stream",
        };
      }

      if (args === undefined || typeof args !== "object") {
        return {};
      }

      // Extract relevant metadata from args
      const {
        model,
        temperature,
        max_tokens,
        top_p,
        frequency_penalty,
        presence_penalty,
        stream,
      } = args as Record<string, unknown>;

      return {
        metadata: {
          llm: {
            provider: inferProvider(openAiInstance.baseURL),
            model,
            temperature,
            max_tokens,
            top_p,
            frequency_penalty,
            presence_penalty,
            stream,
          },
        },
      };
    },
    replacementImplementations: {
      "OpenAI.beta.chat.completions.runTools": (_target, value) => {
        if (typeof value === "function") {
          const componentOpts = opts.getComponentOpts?.(
            ["OpenAI", "beta", "chat", "completions", "runTools"],
            value,
          );

          const fn = Component(
            "OpenAI.beta.chat.completions.runTools",
            async (
              ...params: Parameters<
                typeof openAiInstance.beta.chat.completions.runTools
              >
            ) => {
              const [first, ...rest] = params;
              const { tools } = first;

              // Wrap each tool with GenSX functionality
              const wrappedTools = tools.map((tool) => {
                if ((tool as any).$brand === "auto-parseable-tool") {
                  const newTool = { ...tool };

                  Object.defineProperty(newTool, "$brand", {
                    value: (tool as any).$brand,
                  });

                  const boundCallback = (tool as any).$callback.bind(newTool);

                  Object.defineProperty(newTool, "$callback", {
                    value: Component(
                      `Tool.${tool.function.name}`,
                      boundCallback as (input?: object) => unknown,
                    ),
                  });
                  Object.defineProperty(newTool, "$parseRaw", {
                    value: (tool as any).$parseRaw,
                  });

                  return newTool;
                } else {
                  const runnableTool =
                    tool as RunnableToolFunctionWithParse<object>;
                  return {
                    ...runnableTool,
                    function: {
                      ...runnableTool.function,
                      function: Component(
                        `Tool.${runnableTool.function.name}`,
                        runnableTool.function.function as (
                          input?: object,
                        ) => unknown,
                      ),
                    },
                  };
                }
              });

              const result = (await value.apply(
                (wrapped as any).beta.chat.completions,
                [
                  {
                    ...first,
                    tools: wrappedTools as (typeof params)[0]["tools"],
                  },
                  ...rest,
                ],
              )) as Record<string, unknown>;

              return result;
            },
            {
              ...componentOpts,
            },
          );

          return fn;
        }

        console.warn(
          "beta.chat.completions.runTools is not a function. Type: ",
          typeof value,
        );
        return value;
      },
    },
  });

  return wrapped;
};

function inferProvider(baseURL: string) {
  if (baseURL.includes("openai")) {
    return "openai";
  }
  if (baseURL.includes("anthropic")) {
    return "anthropic";
  }
  if (baseURL.includes("groq")) {
    return "groq";
  }
  if (baseURL.includes("gemini")) {
    return "google";
  }
  if (baseURL.includes("claude")) {
    return "anthropic";
  }
  if (baseURL.includes("perplexity")) {
    return "perplexity";
  }
  if (baseURL.includes("grok")) {
    return "grok";
  }

  return "unknown";
}
