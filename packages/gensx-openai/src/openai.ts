import type { ComponentOpts, WrapOptions } from "@gensx/core";

import { wrap } from "@gensx/core";
import { OpenAI } from "openai";

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

export const wrapOpenAI = (openAiInstance: OpenAI, opts: WrapOptions = {}) =>
  wrap(openAiInstance, {
    ...opts,
    prefix: "OpenAI",
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
  });

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
