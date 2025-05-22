import type { LanguageModelV1Middleware, Tool, ToolExecutionOptions } from "ai";
import type { z } from "zod";

import * as gensx from "@gensx/core";
import { GsxComponent } from "@gensx/core";
import * as ai from "ai";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createGSXComponent<TFn extends (...args: any[]) => any>(
  name: string,
  fn: TFn,
) {
  return gensx.Component<Parameters<TFn>[0], Awaited<ReturnType<TFn>>>(
    name,
    fn,
  );
}

// Define a more specific type for StreamObject that allows schema
type StreamObjectType = gensx.GsxComponent<
  // Make output optional and allow schema
  Omit<Parameters<typeof ai.streamObject>[0], "output"> & {
    output?: "object" | "array" | "no-schema";

    schema?: z.ZodType | { _type: unknown };
  },
  Awaited<ReturnType<typeof ai.streamObject>>
>;

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
        execute: async (
          args: ToolParams,
          options: ToolExecutionOptions,
        ): Promise<ToolResult> => {
          const ToolComponent = gensx.Component<ToolParams, ToolResult>(
            `Tool_${name}`,
            async (toolArgs) => {
              if (!tool.execute)
                throw new Error(`Tool ${name} has no execute function`);
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return await tool.execute(toolArgs, options);
            },
          );
          return await ToolComponent.run(args);
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

export const gensxMiddleware: LanguageModelV1Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    const DoGenerateComponent = gensx.Component<
      typeof params,
      Awaited<ReturnType<typeof doGenerate>>
    >("DoGenerate", async (_params) => {
      const result = await doGenerate();
      return result;
    });

    const result = await DoGenerateComponent.run(params);

    return result;
  },
  wrapStream: async ({ doStream, params }) => {
    const DoStreamComponent = gensx.Component<
      typeof params,
      Awaited<ReturnType<typeof doStream>>
    >("DoStream", async (_params) => {
      const result = await doStream();
      return result;
    });

    const result = await DoStreamComponent.run(params);

    return result;
  },
};

// Cast to the more specific type
export const StreamObject = createGSXComponent(
  "StreamObject",
  (params: Parameters<typeof ai.streamObject>[0]) => {
    const wrappedModel = ai.wrapLanguageModel({
      model: params.model,
      middleware: gensxMiddleware,
    });

    return ai.streamObject({
      ...params,
      model: wrappedModel,
    });
  },
) as StreamObjectType;

export const StreamText: GsxComponent<
  Parameters<typeof ai.streamText>[0],
  Awaited<ReturnType<typeof ai.streamText>>
> = createGSXComponent(
  "StreamText",
  (params: Parameters<typeof ai.streamText>[0]) => {
    const wrappedModel = ai.wrapLanguageModel({
      model: params.model,
      middleware: gensxMiddleware,
    });

    const wrappedTools = wrapTools(params.tools);

    return ai.streamText({
      ...params,
      model: wrappedModel,
      tools: wrappedTools,
    });
  },
);

export const GenerateText: GsxComponent<
  Parameters<typeof ai.generateText>[0],
  Awaited<ReturnType<typeof ai.generateText>>
> = createGSXComponent(
  "GenerateText",
  async (params: Parameters<typeof ai.generateText>[0]) => {
    const wrappedModel = ai.wrapLanguageModel({
      model: params.model,
      middleware: gensxMiddleware,
    });

    const wrappedTools = wrapTools(params.tools);

    return ai.generateText({
      ...params,
      model: wrappedModel,
      tools: wrappedTools,
    });
  },
);

// Define a more specific type for GenerateObject that allows schema
type GenerateObjectType = GsxComponent<
  // Make output optional and allow schema
  Omit<Parameters<typeof ai.generateObject>[0], "output"> & {
    output?: "object" | "array" | "no-schema";

    schema?: z.ZodType | { _type: unknown };
  },
  Awaited<ReturnType<typeof ai.generateObject>>
>;

// Cast to the more specific type
export const GenerateObject = createGSXComponent(
  "GenerateObject",
  async (params: Parameters<typeof ai.generateObject>[0]) => {
    const wrappedModel = ai.wrapLanguageModel({
      model: params.model,
      middleware: gensxMiddleware,
    });

    return ai.generateObject({
      ...params,
      model: wrappedModel,
    });
  },
) as GenerateObjectType;

export const Embed: GsxComponent<
  Parameters<typeof ai.embed>[0],
  Awaited<ReturnType<typeof ai.embed>>
> = createGSXComponent("Embed", ai.embed);

export const EmbedMany: GsxComponent<
  Parameters<typeof ai.embedMany>[0],
  Awaited<ReturnType<typeof ai.embedMany>>
> = createGSXComponent("EmbedMany", ai.embedMany);

export const GenerateImage: GsxComponent<
  Parameters<typeof ai.experimental_generateImage>[0],
  Awaited<ReturnType<typeof ai.experimental_generateImage>>
> = createGSXComponent("GenerateImage", ai.experimental_generateImage);

export { wrap, wrapFunction } from "./wrap.js";
