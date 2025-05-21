/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { LanguageModelV1Middleware, Tool, ToolExecutionOptions } from "ai";

import { createComponent } from "@gensx/core";
import * as ai from "ai";

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
          const ToolComponent = createComponent(
            async (toolArgs) => {
              if (!tool.execute)
                throw new Error(`Tool ${name} has no execute function`);
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              return await tool.execute(toolArgs, options);
            },
            { name: `Tool_${name}` },
          );
          return await ToolComponent(args);
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
    const DoGenerateComponent = createComponent(
      async (_params) => {
        const result = await doGenerate();
        return result;
      },
      { name: "DoGenerate" },
    );

    const result = await DoGenerateComponent(params);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return result;
  },
  wrapStream: async ({ doStream, params }) => {
    const DoStreamComponent = createComponent(
      async (_params) => {
        const result = await doStream();
        return result;
      },
      { name: "DoStream" },
    );

    const result = await DoStreamComponent(params);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return result;
  },
};

export const streamText = createComponent(
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
  { name: "StreamText" },
) as unknown as typeof ai.streamText;

export const streamObject = createComponent(
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
  { name: "StreamObject" },
) as unknown as typeof ai.streamObject;

export const generateObject = createComponent(
  async (params: Parameters<typeof ai.generateObject>[0]) => {
    const wrappedModel = ai.wrapLanguageModel({
      model: params.model,
      middleware: gensxMiddleware,
    });

    return ai.generateObject({
      ...params,
      model: wrappedModel,
    } as Parameters<typeof ai.generateObject>[0]);
  },
  { name: "GenerateObject" },
) as typeof ai.generateObject;

export const generateText = createComponent(
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
  { name: "GenerateText" },
) as typeof ai.generateText;

export const embed = createComponent(ai.embed, {
  name: "embed",
}) as unknown as typeof ai.embed;

export const embedMany = createComponent(ai.embedMany, {
  name: "embedMany",
}) as unknown as typeof ai.embedMany;

export const generateImage = createComponent(ai.experimental_generateImage, {
  name: "generateImage",
}) as unknown as typeof ai.experimental_generateImage;
