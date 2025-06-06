/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import type { Tool, ToolExecutionOptions } from "ai";

import { Component, ComponentOpts, wrap } from "@gensx/core";
import * as ai from "ai";

export type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

// Helper function to wrap tools in GSX components
function wrapTools<T extends Record<string, Tool>>(
  tools: T | undefined,
): T | undefined {
  if (!tools) return undefined;

  return Object.entries(tools).reduce<Record<string, T[string]>>(
    (acc, [name, tool]) => {
      if (!tool.execute) return acc;

      type ToolParams = Parameters<typeof tool.execute>[0];
      type ToolResult = Awaited<ReturnType<typeof tool.execute>>;

      const wrappedTool = {
        ...tool,
        execute: (
          args: ToolParams,
          options: ToolExecutionOptions,
        ): Promise<ToolResult> => {
          const ToolComponent = Component(
            `tool.${name}`,
            async (toolArgs: ToolParams) => {
              if (!tool.execute)
                throw new Error(`Tool ${name} has no execute function`);

              return await tool.execute(toolArgs, options);
            },
          );
          return ToolComponent(args as unknown as object);
        },
      } as unknown as T[string];

      return {
        ...acc,
        [name]: wrappedTool,
      };
    },
    {},
  ) as unknown as T;
}

// Export the original functions with proper typing
export const streamText = Component(
  "StreamText",
  new Proxy(ai.streamText, {
    apply: (target, thisArg, args) => {
      const [first, ...rest] = args;

      const wrappedTools = wrapTools(first.tools);

      return Reflect.apply(target, thisArg, [
        {
          ...first,
          model: wrapVercelAIModel(first.model),
          tools: wrappedTools,
        },
        ...rest,
      ]);
    },
  }),
) as typeof ai.streamText;

export const streamObject = Component(
  "StreamObject",
  new Proxy(ai.streamObject, {
    apply: (target, thisArg, args) => {
      const [first, ...rest] = args;

      return Reflect.apply(target, thisArg, [
        {
          ...first,
          model: wrapVercelAIModel(first.model),
        },
        ...rest,
      ]);
    },
  }),
) as typeof ai.streamObject;

export const generateObject = Component(
  "GenerateObject",
  new Proxy(ai.generateObject, {
    apply: (target, thisArg, args) => {
      const [first, ...rest] = args;

      return Reflect.apply(target, thisArg, [
        {
          ...first,
          model: wrapVercelAIModel(first.model),
        },
        ...rest,
      ]);
    },
  }),
) as typeof ai.generateObject;

export const generateText = Component(
  "GenerateText",
  new Proxy(ai.generateText, {
    apply: (target, thisArg, args) => {
      const [first, ...rest] = args;

      const wrappedTools = wrapTools(first.tools);

      return Reflect.apply(target, thisArg, [
        {
          ...first,
          model: wrapVercelAIModel(first.model),
          tools: wrappedTools,
        },
        ...rest,
      ]);
    },
  }),
) as typeof ai.generateText;

export const embed = Component("embed", ai.embed) as typeof ai.embed;

export const embedMany = Component(
  "embedMany",
  ai.embedMany,
) as typeof ai.embedMany;

export const generateImage = Component(
  "generateImage",
  ai.experimental_generateImage,
) as typeof ai.experimental_generateImage;

export const wrapVercelAIModel = <T extends object>(
  languageModel: T,
  componentOpts?: ComponentOpts,
): T => {
  assertIsLanguageModel(languageModel);

  const componentName = componentOpts?.name ?? languageModel.provider;
  return new Proxy(languageModel, {
    get(target, propKey, receiver) {
      const originalValue = Reflect.get(target, propKey, receiver);
      if (typeof originalValue === "function") {
        let aggregator: ((chunks: any[]) => unknown) | undefined;
        let __streamingResultKey: string | undefined;
        if (propKey === "doStream") {
          __streamingResultKey = "stream";
          aggregator =
            componentOpts?.aggregator ??
            ((
              chunks: {
                type: "text-delta" | "tool-call" | "finish" | "something-else";
                textDelta: string;
                usage: unknown;
                finishReason: unknown;
              }[],
            ) => {
              return chunks.reduce(
                (aggregated, chunk) => {
                  if (chunk.type === "text-delta") {
                    return {
                      ...aggregated,
                      text: aggregated.text + chunk.textDelta,
                    };
                  } else if (chunk.type === "tool-call") {
                    return {
                      ...aggregated,
                      ...chunk,
                    };
                  } else if (chunk.type === "finish") {
                    return {
                      ...aggregated,
                      usage: chunk.usage,
                      finishReason: chunk.finishReason,
                    };
                  } else {
                    return aggregated;
                  }
                },
                {
                  text: "",
                },
              );
            });
        }
        return Component(
          componentName,
          originalValue.bind(target) as (input: object) => unknown,
          {
            ...componentOpts,
            aggregator,
            __streamingResultKey,
          },
        );
      } else if (
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        originalValue != null &&
        !Array.isArray(originalValue) &&
        !(originalValue instanceof Date) &&
        typeof originalValue === "object"
      ) {
        return wrap(originalValue, {
          prefix: [componentName, propKey.toString()].join("."),
        });
      } else {
        return originalValue;
      }
    },
  });
};

function assertIsLanguageModel(
  languageModel: object,
): asserts languageModel is ai.LanguageModelV1 {
  if (
    !("doStream" in languageModel) ||
    typeof languageModel.doStream !== "function" ||
    !("doGenerate" in languageModel) ||
    typeof languageModel.doGenerate !== "function"
  ) {
    throw new Error(`Invalid model. Is this a LanguageModelV1 instance?`);
  }
}
