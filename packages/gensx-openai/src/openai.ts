/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import type { ComponentOpts, WrapOptions } from "@gensx/core";

import { Component, wrap } from "@gensx/core";
import { OpenAI as OriginalOpenAI } from "openai";
import { RunnableToolFunctionWithParse } from "openai/lib/RunnableFunction.mjs";

/**
 * A pre-wrapped version of the OpenAI SDK that makes all methods available as GenSX components.
 *
 * @example
 * ```ts
 * import { openai } from "@gensx/openai";
 *
 * // Use chat completions
 * const completion = await openai.chat.completions.create({
 *   model: "gpt-4",
 *   messages: [{ role: "user", content: "Hello!" }]
 * });
 *
 * // Use embeddings
 * const embedding = await openai.embeddings.create({
 *   model: "text-embedding-ada-002",
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
      // Only add metadata for completion methods
      if (!path.join(".").includes("completions.create")) {
        return {};
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
      "OpenAI.beta.chat.completions.runTools": (target, value) => {
        if (typeof value === "function") {
          const componentOpts = opts.getComponentOpts?.(
            ["OpenAI", "beta", "chat", "completions", "runTools"],
            value,
          );

          const fn = Component(
            "openai.beta.chat.completions.runTools",
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
                        {
                          name: `Tool.${runnableTool.function.name}`,
                        },
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

              if (result && typeof result === "object") {
                const maybeFinalContent = (result as any).finalContent;
                if (typeof maybeFinalContent === "function") {
                  const originalFinalContent = maybeFinalContent.bind(result);
                  (result as any).finalContent = Component(
                    "openai.beta.chat.completions.runTools.finalContent",
                    (...fcArgs: unknown[]) => originalFinalContent(...fcArgs),
                    {
                      name: "beta.chat.completions.runTools.finalContent",
                    },
                  );
                }
              }

              return result;
            },
            {
              name: "beta.chat.completions.runTools",
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
