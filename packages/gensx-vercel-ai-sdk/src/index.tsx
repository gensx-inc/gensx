import type { LanguageModelV1Middleware } from "ai";
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

// Cast to the more specific type
export const StreamObject = createGSXComponent(
  "StreamObject",
  ai.streamObject,
) as StreamObjectType;

export const StreamText: GsxComponent<
  Parameters<typeof ai.streamText>[0],
  Awaited<ReturnType<typeof ai.streamText>>
> = createGSXComponent("StreamText", ai.streamText);

export const logMiddleware: LanguageModelV1Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    console.info("doGenerate called");
    console.info(`params: ${JSON.stringify(params, null, 2)}`);
    const DoGenerateComponent = gensx.Component<
      typeof params,
      Awaited<ReturnType<typeof doGenerate>>
    >("DoGenerate", async (_params) => {
      const result = await doGenerate();
      return result;
    });

    const result = await DoGenerateComponent.run(params);

    console.info("doGenerate finished");
    console.info(`generated text: ${JSON.stringify(result, null, 2)}`);

    return result;
  },
};

export const GenerateText: GsxComponent<
  Parameters<typeof ai.generateText>[0],
  Awaited<ReturnType<typeof ai.generateText>>
> = createGSXComponent(
  "GenerateText",
  async (params: Parameters<typeof ai.generateText>[0]) => {
    const wrappedModel = ai.wrapLanguageModel({
      model: params.model,
      middleware: logMiddleware,
    });

    return ai.generateText({
      ...params,
      model: wrappedModel,
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
  ai.generateObject,
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
