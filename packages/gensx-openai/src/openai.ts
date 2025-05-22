/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import type { ComponentOpts, WrapOptions } from "@gensx/core";

import { wrap, wrapFunction } from "@gensx/core";
import { OpenAI as OriginalOpenAI } from "openai";

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
    wrapOpenAI(this);
  }
}

export const wrapOpenAI = (
  openAiInstance: OriginalOpenAI,
  opts: WrapOptions = {},
) => {
  // Create a wrapped instance
  const wrapped = wrap(openAiInstance, {
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
      "beta.chat.completions.runTools": (target, value) => {
        if (typeof value === "function") {
          // Bind the original `this` so SDK internals keep working
          const boundRunTools = value.bind(target) as (
            ...args: Parameters<
              typeof openAiInstance.beta.chat.completions.runTools
            >
          ) => unknown;
          const componentOpts = opts.getComponentOpts?.(
            ["beta", "chat", "completions", "runTools"],
            boundRunTools,
          );

          const fn = wrapFunction(
            (
              ...params: Parameters<
                typeof openAiInstance.beta.chat.completions.runTools
              >
            ) => {
              const [first, ...rest] = params;
              const { tools } = first;

              // Wrap each tool with GenSX functionality
              const wrappedTools = tools.map((tool) => {
                return new Proxy(tool, {
                  get(toolTarget, prop, _receiver) {
                    console.log("toolTarget", toolTarget, prop);
                    if (prop === "$callback") {
                      return wrapFunction(
                        (toolTarget as any).$callback,
                        `Tool.${tool.function.name}`,
                      );
                    }

                    return (target as any)[prop];
                  },
                });
              });

              // Call the original runTools with wrapped tools
              return boundRunTools(
                {
                  ...first,
                  tools: wrappedTools as (typeof params)[0]["tools"],
                },
                ...rest,
              );
            },
            "beta.chat.completions.runTools",
            componentOpts,
          );

          return fn;
        }

        console.warn(
          "beta.chat.completions.runTools is not a function. Type: ",
          typeof value,
        );
        return value as object;
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
